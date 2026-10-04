import { describe, expect, test } from "bun:test";
import { createDaemonPostResultFetcher, type FetchLike } from "./daemon-client.js";

describe("daemon POST redirect boundary", () => {
	test("rejects a synthetic redirect without forwarding body or token", async () => {
		const requests: string[] = [];
		const fetchImpl: FetchLike = async (input, init) => {
			requests.push(String(input));
			expect(init?.method).toBe("POST");
			expect(init?.redirect).toBe("error");
			expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer synthetic-token");
			expect(init?.body).toBe(JSON.stringify({ userMessage: "synthetic prompt" }));
			// Model fetch's redirect:error response; no second request is made.
			throw new TypeError("synthetic redirect rejected");
		};
		const post = createDaemonPostResultFetcher("http://daemon.test", fetchImpl, { SIGNET_API_KEY: "synthetic-token" });
		expect(await post("/api/hooks/user-prompt-submit", { userMessage: "synthetic prompt" }, 5_000)).toEqual({ ok: false, reason: "offline" });
		expect(requests).toEqual(["http://daemon.test/api/hooks/user-prompt-submit"]);
	});

	test("real fetch does not forward a POST through a loopback 307 redirect", async () => {
		const requests: Array<{ path: string; method: string; authorization: string | null; body: string }> = [];
		const server = Bun.serve({
			hostname: "127.0.0.1",
			port: 0,
			async fetch(request) {
				const path = new URL(request.url).pathname;
				requests.push({
					path,
					method: request.method,
					authorization: request.headers.get("Authorization"),
					body: await request.text(),
				});
				return path === "/api/hooks/user-prompt-submit"
					? new Response(null, { status: 307, headers: { Location: "/redirect-target" } })
					: Response.json({ forwarded: true });
			},
		});
		try {
			const post = createDaemonPostResultFetcher(server.url.href, globalThis.fetch, { SIGNET_TOKEN: "synthetic-token" });
			expect(await post("/api/hooks/user-prompt-submit", { userMessage: "synthetic prompt" }, 5_000)).toEqual({ ok: false, reason: "offline" });
			expect(requests).toEqual([{
				path: "/api/hooks/user-prompt-submit",
				method: "POST",
				authorization: "Bearer synthetic-token",
				body: JSON.stringify({ userMessage: "synthetic prompt" }),
			}]);
		} finally {
			await server.stop(true);
		}
	});
});
