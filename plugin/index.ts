// OpenCode V2 plugin for Rembric.
//
// Upstream Rembric ships an opencode plugin written against the V1 plugin API
// (`export const RembricPlugin = async (ctx) => ({ config, event, 'chat.message' })`),
// which OpenCode 2.x does not load. This is an independently written V2 plugin that
// keeps upstream's harness-agnostic session protocol (`core/rembric-plugin-core.mjs`,
// vendored unmodified under its MIT licence) and maps it onto the V2 hook surface.
//
// Behaviour that follows from the V2 API:
//   - No `config` hook: the MCP server is configured directly in opencode.jsonc.
//   - Nudges reach the model as transient system text via the `context` hook,
//     never as appended user-message parts, so they cannot become part of the
//     user's persisted turn.
//   - V2 system parts live for exactly one model request, so the injected text
//     is cached per session and re-pushed on every request until the session is
//     compacted, closed, or refreshes per turn. A cache miss rehydrates from the
//     daemon rather than dropping the context.
//   - The default export is a plain `{ id, setup }` object, matching upstream
//     Rembric, so the built bundle has no runtime dependency and can be dropped
//     into OpenCode's global plugin directory as a standalone file.
//   - Events are filtered to this plugin instance's directory, so sessions in
//     other projects are not reported under this one.
import { createSessionProtocol, diag } from "./core/rembric-plugin-core.mjs";
import { readRembricSlug } from "./core/rembric-dotenv.mjs";

type Rec = Record<string, unknown>;

function str(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function rec(value: unknown): Rec {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Rec) : {};
}

// V2 versions event types (".1"), may wrap them in a sync envelope, and may carry
// the payload under either `data` or `properties`.
function unwrap(raw: unknown): { type: string | undefined; data: Rec } {
	const envelope = rec(rec(raw).payload ?? raw);
	const source = envelope.type === "sync" && envelope.syncEvent ? rec(envelope.syncEvent) : envelope;
	const type = str(source.type)?.replace(/\.\d+$/, "");
	return { type, data: rec(source.data ?? source.properties) };
}

type V2SystemPart = { type: string; text?: string };

type V2PromptInput = {
	readonly sessionID: string;
	readonly messageID?: string;
	prompt: { text?: string };
};

type V2ContextInput = {
	readonly sessionID: string;
	system: V2SystemPart[];
};

interface V2SessionHooks {
	readonly prompt: V2PromptInput;
	readonly context: V2ContextInput;
}

type V2EventEnvelope = {
	type?: string;
	data?: Record<string, unknown>;
	properties?: Record<string, unknown>;
	payload?: unknown;
	syncEvent?: unknown;
};

type V2ToolExecuteBefore = { readonly sessionID?: string };

type V2PluginContext = {
	readonly app: { readonly version: string };
	readonly location?: { readonly directory?: string };
	readonly session: {
		hook<Name extends keyof V2SessionHooks>(
			name: Name,
			callback: (input: V2SessionHooks[Name]) => Promise<void> | void,
		): Promise<unknown>;
		get(input: { sessionID: string }): Promise<unknown>;
	};
	readonly tool: {
		hook(
			name: "execute.before",
			callback: (input: V2ToolExecuteBefore) => Promise<void> | void,
		): Promise<unknown>;
	};
	readonly event: {
		subscribe(input: { signal: AbortSignal }): AsyncIterable<V2EventEnvelope>;
	};
};

interface V2Plugin {
	readonly id: string;
	readonly setup: (context: V2PluginContext) => Promise<(() => void) | void>;
}

const rembricPlugin: V2Plugin = {
	id: "rembric.lifecycle",
	async setup(ctx) {
		const serverUrl = process.env.REMBRIC_SERVER_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8787";
		const apiToken = process.env.REMBRIC_API_TOKEN;
		const directory = ctx.location?.directory ?? process.cwd();
		// One Rembric project holds this host's memories; `.rembric` can override per repo.
		const slug = readRembricSlug(directory) ?? process.env.REMBRIC_PROJECT_SLUG ?? "default";
		const refreshEveryTurn = process.env.REMBRIC_INJECT_ALWAYS === "1";

		const core = createSessionProtocol({
			agent: "opencode",
			serverUrl,
			apiToken,
			slug,
			cwd: directory,
		});

		if (core.disabled) {
			diag(`hooks disabled: ${core.disabledReason}`);
			return;
		}

		const contexts = new Map<string, string>();
		const lastPrompt = new Map<string, string>();
		const reported = new Set<string>();
		const belongs = new Map<string, boolean>();
		const assistantText = new Map<string, Map<number, string>>();
		const closed = { value: false };

		function forget(entries: ReadonlyArray<{ id?: string }> = []): void {
			for (const entry of entries) {
				if (!entry?.id) continue;
				assistantText.delete(entry.id);
			}
		}

		function dropSession(sessionID: string): void {
			contexts.delete(sessionID);
			lastPrompt.delete(sessionID);
			reported.delete(sessionID);
			belongs.delete(sessionID);
			forget(core.forgetSession(sessionID) ?? []);
		}

		// The injected block: standing nudges plus daemon recall hints.
		async function buildContext(sessionID: string, promptText: string): Promise<string> {
			const lines: string[] = [];
			try {
				lines.push(...core.nudgesForTurn(sessionID, promptText));
			} catch {
				// a nudge failure must never break the request
			}
			try {
				lines.push(...(await core.recallHints(sessionID, promptText)));
			} catch {
				// recall is best-effort
			}
			return lines.filter(Boolean).join("\n");
		}

		// Resolved once per session and remembered: V2 events carry no project scope
		// of their own, and the check runs on every context hook.
		async function belongsHere(sessionID: string): Promise<boolean> {
			const known = belongs.get(sessionID);
			if (known !== undefined) return known;
			let result: boolean;
			try {
				const session = rec(await ctx.session.get({ sessionID }));
				const sessionDirectory = str(rec(session.location).directory) ?? str(session.directory);
				result = sessionDirectory === undefined || sessionDirectory === directory;
			} catch {
				// An unresolvable session is not ours to report.
				result = false;
			}
			belongs.set(sessionID, result);
			return result;
		}

		await ctx.session.hook("prompt", async (event) => {
			const sessionID = str(rec(event).sessionID);
			if (!sessionID || closed.value) return;
			if (core.isSubAgent(sessionID)) return;

			reported.delete(sessionID);
			core.beginTurn(sessionID);
			await core.ensureSession(sessionID);

			const prompt = rec(rec(event).prompt);
			const text = str(prompt.text) ?? "";
			if (text) lastPrompt.set(sessionID, text);
			if (text) forget(core.appendUserMessage(sessionID, text));

			if (refreshEveryTurn) contexts.delete(sessionID);
			if (!contexts.has(sessionID)) {
				const built = await buildContext(sessionID, text);
				if (built) contexts.set(sessionID, built);
			}
		});

		await ctx.session.hook("context", async (event) => {
			const sessionID = str(rec(event).sessionID);
			if (!sessionID || closed.value) return;
			if (core.isSubAgent(sessionID)) return;
			if (!(await belongsHere(sessionID))) return;

			// A resumed session (host or plugin restart) has an empty cache; rebuild
			// it from the daemon instead of sending this request without context.
			if (!contexts.has(sessionID)) {
				const built = await buildContext(sessionID, lastPrompt.get(sessionID) ?? "");
				if (built) contexts.set(sessionID, built);
			}

			const injected = contexts.get(sessionID);
			const system = rec(event).system;
			if (injected && Array.isArray(system)) system.push({ type: "text", text: injected });
		});

		await ctx.tool.hook("execute.before", (event) => {
			const sessionID = str(rec(event).sessionID);
			if (sessionID) core.markToolUsed(sessionID);
		});

		const controller = new AbortController();
		void (async () => {
			try {
				for await (const raw of ctx.event.subscribe({ signal: controller.signal })) {
					if (closed.value) break;
					const { type, data } = unwrap(raw);
					if (!type) continue;

					if (type === "session.created") {
						const sessionID = str(data.sessionID) ?? str(rec(data.session).id);
						if (!sessionID) continue;
						// Sub-agents are noise in the session list.
						if (str(data.parentID) || str(rec(data.session).parentID)) {
							core.markSubAgent(sessionID);
							continue;
						}
						if (!(await belongsHere(sessionID))) continue;
						await core.ensureSession(sessionID);
						continue;
					}

					if (type === "session.deleted") {
						const sessionID = str(data.sessionID) ?? str(rec(data.session).id);
						if (!sessionID) continue;
						dropSession(sessionID);
						continue;
					}

					// V2 streams assistant text as `session.text.*`, not as message parts.
					// `ended` carries the finished text for one ordinal, so accumulating by
					// ordinal is idempotent and survives retries.
					if (type === "session.text.ended") {
						const sessionID = str(data.sessionID);
						const messageID = str(data.assistantMessageID);
						const text = str(data.text);
						if (!sessionID || !messageID || !text) continue;
						if (core.isSubAgent(sessionID) || !core.isKnown(sessionID)) continue;
						let parts = assistantText.get(messageID);
						if (!parts) {
							parts = new Map<number, string>();
							assistantText.set(messageID, parts);
						}
						parts.set(Number(data.ordinal ?? 0), text);
						const joined = Array.from(parts.entries())
							.sort((a, b) => a[0] - b[0])
							.map(([, part]) => part)
							.join("\n")
							.trim();
						if (joined) forget(core.upsertAssistantMessage(sessionID, messageID, joined));
						continue;
					}

					if (type === "session.compaction.ended") {
						const sessionID = str(data.sessionID);
						if (!sessionID || core.isSubAgent(sessionID) || !core.isKnown(sessionID)) continue;
						// Compaction rewrites the transcript, so the cached block is stale.
						contexts.delete(sessionID);
						await core.flushSessionSummary(sessionID);
						continue;
					}

					if (type === "session.idle" || type === "session.execution.succeeded") {
						const sessionID = str(data.sessionID);
						if (!sessionID || core.isSubAgent(sessionID) || !core.isKnown(sessionID)) continue;
						core.scheduleIdleFlush(sessionID);
						if (!reported.has(sessionID)) {
							reported.add(sessionID);
							void core.reportTurn(sessionID);
						}
						continue;
					}

					if (type === "global.disposed") {
						core.flushAllFireAndForget();
					}
				}
			} catch (error) {
				if (!closed.value) diag(`event stream ended: ${String(error).slice(0, 200)}`);
			}
		})();

		diag(`loaded for OpenCode ${ctx.app.version} (project ${slug}, server ${core.baseUrl || "unset"})`);

		return () => {
			closed.value = true;
			controller.abort();
			core.flushAllFireAndForget();
			contexts.clear();
			lastPrompt.clear();
			reported.clear();
			belongs.clear();
			assistantText.clear();
		};
	},
};

export default rembricPlugin;
