// OpenCode V2 adapter for Rembric.
//
// Upstream ships an opencode plugin written against the V1 plugin API
// (`export const RembricPlugin = async (ctx) => ({ config, event, 'chat.message' })`),
// which OpenCode 2.x does not load. This adapter keeps upstream's
// harness-agnostic session protocol (`core/rembric-plugin-core.mjs`, vendored
// unmodified under its MIT licence) and maps it onto the V2 hook surface.
//
// Behaviour that follows from the V2 API:
//   - No `config` hook: the MCP server is configured directly in opencode.jsonc.
//   - Nudges reach the model as transient system text via the `context` hook,
//     never as appended user-message parts, so they cannot become part of the
//     user's persisted turn.
//   - V2 system parts live for exactly one model request, so the injected text
//     is cached per session and re-pushed on every request until the session is
//     compacted, closed, or refreshes per turn. A cache miss rehydrates from
//     the daemon rather than dropping the context.
//   - Events are filtered to this plugin instance's directory, so sessions in
//     other projects are not reported under this one.
import { Plugin } from "@opencode/plugin";
import { createSessionProtocol } from "./core/rembric-plugin-core.mjs";
import { readRembricSlug } from "./core/rembric-dotenv.mjs";

type Rec = Record<string, unknown>;

function str(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function rec(value: unknown): Rec {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Rec) : {};
}

// V2 versions event types (".1") and may wrap them in a sync envelope.
function unwrap(raw: unknown): { type: string | undefined; data: Rec } {
	const envelope = rec(rec(raw).payload ?? raw);
	const source = envelope.type === "sync" && envelope.syncEvent ? rec(envelope.syncEvent) : envelope;
	const type = str(source.type)?.replace(/\.\d+$/, "");
	return { type, data: rec(source.data) };
}

export default Plugin.define({
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
			console.warn(`[rembric] hooks disabled: ${core.disabledReason}`);
			return;
		}

		const contexts = new Map<string, string>();
		const lastPrompt = new Map<string, string>();
		const suppressed = new Set<string>();
		const messageIDs = new Map<string, string>();
		const assistantMessages = new Set<string>();
		const assistantText = new Map<string, Map<string, string>>();
		const reported = new Set<string>();
		const closed = { value: false };

		function forget(entries: ReadonlyArray<{ id?: string }> = []): void {
			for (const entry of entries) {
				if (!entry?.id) continue;
				assistantMessages.delete(entry.id);
				assistantText.delete(entry.id);
			}
		}

		function dropSession(sessionID: string): void {
			contexts.delete(sessionID);
			lastPrompt.delete(sessionID);
			suppressed.delete(sessionID);
			messageIDs.delete(sessionID);
			reported.delete(sessionID);
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

		async function belongsHere(sessionID: string): Promise<boolean> {
			try {
				const session = rec(await ctx.session.get({ sessionID }));
				const sessionDirectory = str(rec(session.location).directory) ?? str(session.directory);
				return sessionDirectory === undefined || sessionDirectory === directory;
			} catch {
				// An unresolvable session is not ours to report.
				return false;
			}
		}

		await ctx.session.hook("prompt", async (event) => {
			const sessionID = str(rec(event).sessionID);
			if (!sessionID || closed.value) return;
			if (core.isSubAgent(sessionID)) return;

			const messageID = str(rec(event).messageID);
			if (messageID) messageIDs.set(sessionID, messageID);

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

			// A resumed session (host or plugin restart) has an empty cache; rebuild
			// it from the daemon instead of sending this request without context.
			if (!suppressed.has(sessionID) && !contexts.has(sessionID)) {
				const built = await buildContext(sessionID, lastPrompt.get(sessionID) ?? "");
				if (built) contexts.set(sessionID, built);
			}

			const injected = suppressed.has(sessionID) ? undefined : contexts.get(sessionID);
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

					if (type === "session.compaction.ended") {
						const sessionID = str(data.sessionID);
						if (!sessionID || core.isSubAgent(sessionID) || !core.isKnown(sessionID)) continue;
						// Compaction rewrites the transcript, so the cached block is stale.
						contexts.delete(sessionID);
						await core.flushSessionSummary(sessionID);
						continue;
					}

					if (type === "message.updated") {
						const info = rec(data.info);
						const sessionID = str(info.sessionID);
						if (!sessionID || core.isSubAgent(sessionID)) continue;
						const id = str(info.id);
						if (id && info.role === "assistant") assistantMessages.add(id);
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
					}
				}
			} catch (error) {
				if (!closed.value) console.warn(`[rembric] event stream ended: ${String(error).slice(0, 200)}`);
			}
		})();

		console.info(
			`[rembric.lifecycle] loaded for OpenCode ${ctx.app.version} (project ${slug}, server ${core.baseUrl || "unset"})`,
		);

		return () => {
			closed.value = true;
			controller.abort();
			core.flushAllFireAndForget();
			contexts.clear();
			lastPrompt.clear();
			suppressed.clear();
			messageIDs.clear();
		};
	},
});
