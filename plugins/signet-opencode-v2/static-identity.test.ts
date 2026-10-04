import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	readStaticIdentity,
	STATIC_IDENTITY_OFFLINE_STATUS,
	STATIC_IDENTITY_SESSION_START_TIMEOUT_STATUS,
} from "./static-identity.js";

const temporaryDirectories: string[] = [];

function makeIdentityDirectory(): string {
	const directory = mkdtempSync(join(tmpdir(), "signet-opencode-v2-identity-"));
	temporaryDirectories.push(directory);
	return directory;
}

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("V1-compatible static identity fallback", () => {
	test("reads configured identity files and uses caller-provided offline or timeout status", () => {
		const directory = makeIdentityDirectory();
		writeFileSync(
			join(directory, "agent.yaml"),
			"identity:\n  mode: managed\n  startup:\n    load:\n      - path: CUSTOM.md\n        role: workspace guidance\n        budget: 12\n",
		);
		writeFileSync(join(directory, "CUSTOM.md"), "custom identity guidance that exceeds budget");
		writeFileSync(join(directory, "SOUL.md"), "not selected by this config");

		const offline = readStaticIdentity(directory);
		const timeout = readStaticIdentity(directory, STATIC_IDENTITY_SESSION_START_TIMEOUT_STATUS);

		expect(offline).toContain(STATIC_IDENTITY_OFFLINE_STATUS);
		expect(offline).toContain("## workspace guidance");
		expect(offline).toContain("custom ident\n[truncated]");
		expect(offline).not.toContain("not selected by this config");
		expect(timeout).toContain(STATIC_IDENTITY_SESSION_START_TIMEOUT_STATUS);
		expect(timeout).not.toContain(STATIC_IDENTITY_OFFLINE_STATUS);
	});

	test("respects a disabled identity mode and the minimal preset", () => {
		const directory = makeIdentityDirectory();
		writeFileSync(join(directory, "agent.yaml"), "identity:\n  preset: minimal\n");
		writeFileSync(join(directory, "AGENTS.md"), "minimal rules");
		writeFileSync(join(directory, "SOUL.md"), "not loaded by minimal preset");

		const minimal = readStaticIdentity(directory);
		expect(minimal).toContain("minimal rules");
		expect(minimal).not.toContain("not loaded by minimal preset");

		writeFileSync(join(directory, "agent.yaml"), "capabilities:\n  identity:\n    mode: off\nidentity:\n  mode: managed\n");
		expect(readStaticIdentity(directory)).toBeNull();
	});
});
