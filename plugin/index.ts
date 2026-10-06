import { Plugin } from "@opencode/plugin";
import { installSignetLifecycle } from "./lifecycle.js";

export default Plugin.define({
	id: "signet.lifecycle",
	async setup(ctx) {
		const cleanup = await installSignetLifecycle(ctx);
		console.info(`[signet.lifecycle] loaded revision 2026-10-04.4 (OpenCode ${ctx.app.version})`);
		return cleanup;
	},
});
