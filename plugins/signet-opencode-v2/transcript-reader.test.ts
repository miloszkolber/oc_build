import { describe, expect, test } from "bun:test";
import type { MessageListOutput } from "@opencode/client";
import { createTranscriptReader } from "./transcript-reader.js";
import type { FetchLike } from "./daemon-client.js";

function jsonResponse(value: unknown, status = 200): Response {
	return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

function makeEnv(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
	return {
		OPENCODE_SERVER_USERNAME: "synthetic-user",
		OPENCODE_SERVER_PASSWORD: "synthetic-password",
		...overrides,
	};
}

describe("bounded OpenCode V2 transcript reader", () => {
	test("reads all ascending pages without deleting user-authored memory-looking text", async () => {
		const requests: Array<{ readonly url: URL; readonly init?: RequestInit }> = [];
		const fetchImpl: FetchLike = async (input, init) => {
			const url = new URL(String(input));
			requests.push({ url, init });
			// V2.0.16 MessageHandler rejects order with a cursor; the opaque cursor already encodes it.
			if (url.searchParams.has("cursor") && url.searchParams.has("order")) {
				return jsonResponse({ error: "Cursor cannot be combined with order" }, 400);
			}
			if (!url.searchParams.has("cursor") && url.searchParams.get("order") !== "asc") {
				return jsonResponse({ error: "first page must request ascending order" }, 400);
			}
			expect(url.origin).toBe("http://127.0.0.1:4401");
			expect(url.pathname).toBe("/api/session/ses-synthetic/message");
			expect(init?.method).toBe("GET");
			expect(new Headers(init?.headers).get("authorization")).toStartWith("Basic ");
			expect(new Headers(init?.headers).get("authorization")).not.toContain("synthetic-password");
			expect(init?.redirect).toBe("error");
			if (requests.length === 1) {
				const page = {
					data: [
						{
							id: "msg-user",
							type: "user",
							time: { created: 1 },
							text: "Question <signet-memory-context>private user context</signet-memory-context>continue",
						},
						{
							id: "msg-assistant",
							type: "assistant",
							time: { created: 2 },
							agent: "synthetic-agent",
							model: { providerID: "synthetic-provider", id: "synthetic-model" },
							content: [
								{ type: "text", text: "Answer <signet-memory source=api>private answer context</signet-memory> safely" },
								{ type: "reasoning", text: "not part of the V1 text transcript" },
							],
						},
						{ id: "msg-system", type: "system", time: { created: 3 }, text: "system update omitted" },
					],
					cursor: { next: " opaque cursor value:1 " },
				} satisfies MessageListOutput;
				return jsonResponse(page);
			}
			const finalPage = {
				data: [
					{
						id: "msg-later",
						type: "assistant",
						time: { created: 4 },
						agent: "synthetic-agent",
						model: { providerID: "synthetic-provider", id: "synthetic-model" },
						content: [{ type: "text", text: "later turn" }],
					},
				],
				cursor: { next: null },
			} satisfies MessageListOutput;
			return jsonResponse(finalPage);
		};
		const reader = createTranscriptReader({
			baseUrl: "http://127.0.0.1:4401",
			env: makeEnv(),
			fetchImpl,
			pageSize: 3,
		});

		const transcript = await reader("ses-synthetic");

		expect(requests).toHaveLength(2);
		expect(requests[0]?.url.searchParams.get("order")).toBe("asc");
		expect(requests[0]?.url.searchParams.get("limit")).toBe("3");
		expect(requests[0]?.url.searchParams.has("cursor")).toBe(false);
		expect(requests[1]?.url.searchParams.get("cursor")).toBe(" opaque cursor value:1 ");
		expect(requests[1]?.url.searchParams.has("order")).toBe(false);
		expect(transcript).toBe("User: Question <signet-memory-context>private user context</signet-memory-context>continue\nAssistant: Answer <signet-memory source=api>private answer context</signet-memory> safely\nAssistant: later turn");
		expect(transcript).not.toContain("reasoning");
		expect(transcript).not.toContain("system update");
	});

	test("omits transcripts without service credentials and rejects unsafe or malformed servers", async () => {
		let calls = 0;
		const fetchImpl: FetchLike = async () => {
			calls += 1;
			return jsonResponse({ data: [], cursor: {} });
		};
		const missingAuth = createTranscriptReader({ baseUrl: "http://127.0.0.1:4096", env: {}, fetchImpl });
		const unsafeServer = createTranscriptReader({
			baseUrl: "http://remote.example.test:4096",
			env: makeEnv(),
			fetchImpl,
		});
		const untrustedHttpsServer = createTranscriptReader({
			baseUrl: "https://remote.example.test:4096",
			env: makeEnv(),
			fetchImpl,
		});
		const invalidServer = createTranscriptReader({ baseUrl: "not a URL", env: makeEnv(), fetchImpl });

		expect(await missingAuth("ses-synthetic")).toBeNull();
		expect(await unsafeServer("ses-synthetic")).toBeNull();
		expect(await untrustedHttpsServer("ses-synthetic")).toBeNull();
		expect(await invalidServer("ses-synthetic")).toBeNull();
		expect(calls).toBe(0);
	});

	test("permits a remote HTTPS API only when its exact origin is explicitly trusted", async () => {
		let requestedUrl: URL | undefined;
		const trusted = createTranscriptReader({
			baseUrl: "https://opencode.synthetic.example:9443/api",
			trustedOrigin: "https://opencode.synthetic.example:9443",
			env: makeEnv(),
			fetchImpl: async (input, init) => {
				requestedUrl = new URL(String(input));
				expect(init?.redirect).toBe("error");
				expect(new Headers(init?.headers).get("authorization")).toStartWith("Basic ");
				return jsonResponse({ data: [], cursor: { next: null } });
			},
		});
		const mismatchedTrust = createTranscriptReader({
			baseUrl: "https://opencode.synthetic.example:9443/api",
			trustedOrigin: "https://other.synthetic.example",
			env: makeEnv(),
			fetchImpl: async () => {
				throw new Error("untrusted API should not be contacted");
			},
		});
		const trustedHttp = createTranscriptReader({
			baseUrl: "http://remote.synthetic.example:4096",
			trustedOrigin: "https://remote.synthetic.example",
			env: makeEnv(),
			fetchImpl: async () => {
				throw new Error("remote HTTP should not be contacted");
			},
		});

		expect(await trusted("ses-synthetic")).toBeNull();
		expect(requestedUrl?.origin).toBe("https://opencode.synthetic.example:9443");
		expect(requestedUrl?.pathname).toBe("/api/api/session/ses-synthetic/message");
		expect(await mismatchedTrust("ses-synthetic")).toBeNull();
		expect(await trustedHttp("ses-synthetic")).toBeNull();
	});

	test("never submits a bounded but incomplete transcript", async () => {
		let calls = 0;
		const fetchImpl: FetchLike = async () => {
			calls += 1;
			return jsonResponse({
				data: [{ id: `msg-${calls}`, type: "user", text: `page ${calls}` }],
				cursor: { next: `cursor-${calls}` },
			});
		};
		const reader = createTranscriptReader({
			baseUrl: "http://127.0.0.1:4096",
			env: makeEnv(),
			fetchImpl,
			pageSize: 1,
			maxPages: 2,
			maxMessages: 2,
		});

		expect(await reader("ses-synthetic")).toBeNull();
		expect(calls).toBe(2);

		const tooManyMessages = createTranscriptReader({
			baseUrl: "http://127.0.0.1:4096",
			env: makeEnv(),
			maxMessages: 1,
			fetchImpl: async () => jsonResponse({
				data: [
					{ id: "msg-1", type: "user", text: "first" },
					{ id: "msg-2", type: "assistant", content: [{ type: "text", text: "second" }] },
				],
				cursor: {},
			}),
		});
		expect(await tooManyMessages("ses-synthetic")).toBeNull();
	});

	test("handles API errors, cursor loops, oversized results, and fetch timeouts", async () => {
		const failing = createTranscriptReader({
			baseUrl: "http://127.0.0.1:4096",
			env: makeEnv(),
			fetchImpl: async () => jsonResponse({ error: "synthetic auth failure" }, 401),
		});
		expect(await failing("ses-synthetic")).toBeNull();
		const oversizedPage = createTranscriptReader({
			baseUrl: "http://127.0.0.1:4096",
			env: makeEnv(),
			fetchImpl: async () => new Response("{}", {
				status: 200,
				headers: { "Content-Length": "4000001" },
			}),
		});
		expect(await oversizedPage("ses-synthetic")).toBeNull();
		const malformed = createTranscriptReader({
			baseUrl: "http://127.0.0.1:4096",
			env: makeEnv(),
			fetchImpl: async () => new Response("not JSON", { status: 200 }),
		});
		expect(await malformed("ses-synthetic")).toBeNull();
		const malformedCursor = createTranscriptReader({
			baseUrl: "http://127.0.0.1:4096",
			env: makeEnv(),
			fetchImpl: async () => jsonResponse({ data: [], cursor: { next: "" } }),
		});
		expect(await malformedCursor("ses-synthetic")).toBeNull();

		let cursorRequests = 0;
		const cursorLoop = createTranscriptReader({
			baseUrl: "http://127.0.0.1:4096",
			env: makeEnv(),
			fetchImpl: async () => {
				cursorRequests += 1;
				return jsonResponse({
					data: [{ id: `msg-${cursorRequests}`, type: "user", text: "bounded content" }],
					cursor: { next: "repeated-cursor" },
				});
			},
		});
		expect(await cursorLoop("ses-synthetic")).toBeNull();
		expect(cursorRequests).toBe(2);

		const oversized = createTranscriptReader({
			baseUrl: "http://127.0.0.1:4096",
			env: makeEnv(),
			maxChars: 8,
			fetchImpl: async () => jsonResponse({
				data: [{ id: "msg-large", type: "assistant", content: [{ type: "text", text: "too many characters" }] }],
				cursor: {},
			}),
		});
		expect(await oversized("ses-synthetic")).toBeNull();

		let sawSignal = false;
		const timedOut = createTranscriptReader({
			baseUrl: "http://127.0.0.1:4096",
			env: makeEnv(),
			fetchImpl: async (_input, init) => {
				sawSignal = init?.signal instanceof AbortSignal;
				throw new DOMException("synthetic timeout", "TimeoutError");
			},
		});
		expect(await timedOut("ses-synthetic")).toBeNull();
		expect(sawSignal).toBe(true);
	});
});
