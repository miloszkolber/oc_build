// OpenCode V2 adapter for Rembric.
//
// Upstream ships an opencode plugin written against the V1 plugin API
// (`export const RembricPlugin = async (ctx) => ({ config, event, 'chat.message' })`),
// which OpenCode 2.x does not load. This adapter keeps upstream's
// harness-agnostic session protocol (`core/rembric-plugin-core.mjs`, vendored
// unmodified under its MIT licence) and maps it onto the V2 hook surface.
//
// Differences that follow from the API change:
//   - No `config` hook: the MCP server is configured directly in opencode.jsonc.
//   - Nudges are injected as transient model-request system text via the
//     `context` hook, not appended to the user's message parts, so they never
//     become part of the persisted user input.
//   - `session.idle` is honoured for closure, matching V2's terminal events.
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

export default Plugin.define({
	id: "rembric.lifecycle",
	async setup(ctx) {
		const serverUrl = process.env.REMBRIC_SERVER_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8787";
		const apiToken = process.env.REMBRIC_API_TOKEN;
		const directory = ctx.location?.directory ?? process.cwd();
		// One Rembric project holds this host's memories; `.rembric` can override per repo.
		const slug = readRembricSlug(directory) ?? process.env.REMBRIC_PROJECT_SLUG ?? "default";

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

		const pendingNudges = new Map<string, string[]>();
		const assistantMessages = new Set<string>();
		const assistantText = new Map<string, Map<string, string>>();
		const reported = new Set<string>();
		const closed = { value: false };

		function forget(entries: ReadonlyArray<{ id?: string }>): void {
			for (const entry of entries) {
				if (!entry?.id) continue;
				assistantMessages.delete(entry.id);
				assistantText.delete(entry.id);
			}
		}

		const controller = new AbortController();

		await ctx.session.hook("prompt", async (event) => {
			const sessionID = str(rec(event).sessionID) ?? str(rec(rec(event).session).id);
			if (!sessionID || closed.value) return;
			if (core.isSubAgent(sessionID)) return;

			reported.delete(sessionID);
			core.beginTurn(sessionID);
			await core.ensureSession(sessionID);

			const prompt = rec(rec(event).prompt);
			const text = str(prompt.text) ?? "";
			if (text) forget(core.appendUserMessage(sessionID, text));

			const lines: string[] = [];
			lines.push(...core.nudgesForTurn(sessionID, text));
			try {
				lines.push(...(await core.recallHints(sessionID, text)));
			} catch {
				// recall is best-effort; a failure must not block admission
			}
			if (lines.length > 0) pendingNudges.set(sessionID, lines);
		});

		// Transient injection: reaches the model without becoming user text.
		await ctx.session.hook("context", (event) => {
			const sessionID = str(rec(event).sessionID);
			if (!sessionID) return;
			const lines = pendingNudges.get(sessionID);
			if (!lines || lines.length === 0) return;
			pendingNudges.delete(sessionID);
			const system = (event as Rec).system;
			if (Array.isArray(system)) system.push({ type: "text", text: lines.join("\n") });
		});

		await ctx.tool.hook("execute.before", (event) => {
			const sessionID = str(rec(event).sessionID);
			if (sessionID) core.markToolUsed(sessionID);
		});

		void (async () => {
			try {
				for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
					if (closed.value) break;
					const data = rec(rec(event).data);

					if (event.type === "session.created") {
						const sessionID = str(data.sessionID);
						if (!sessionID) continue;
						if (str(data.parentID)) {
							core.markSubAgent(sessionID);
							continue;
						}
						await core.ensureSession(sessionID);
						continue;
					}

					if (event.type === "session.deleted") {
						const sessionID = str(data.sessionID);
						if (!sessionID) continue;
						reported.delete(sessionID);
						forget(core.forgetSession(sessionID) ?? []);
						pendingNudges.delete(sessionID);
						continue;
					}

					if (event.type === "session.compaction.ended") {
						const sessionID = str(data.sessionID);
						if (!sessionID || core.isSubAgent(sessionID) || !core.isKnown(sessionID)) continue;
						await core.flushSessionSummary(sessionID);
						continue;
					}

					if (event.type === "message.updated") {
						const info = rec(data.info);
						const sessionID = str(info.sessionID);
						if (!sessionID || core.isSubAgent(sessionID)) continue;
						const id = str(info.id);
						if (id && info.role === "assistant") assistantMessages.add(id);
						continue;
					}

					if (event.type === "session.idle" || event.type === "session.execution.succeeded") {
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
		};
	},
});
