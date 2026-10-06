import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export const STATIC_IDENTITY_OFFLINE_STATUS = "[signet: daemon offline — running with static identity]";
export const STATIC_IDENTITY_SESSION_START_TIMEOUT_STATUS =
	"[signet: daemon session-start timed out — running with static identity]";

interface IdentityFileEntry {
	readonly path: string;
	readonly role?: string;
	readonly budget?: number;
}

const STATIC_IDENTITY_FILES: readonly IdentityFileEntry[] = [
	{ path: "AGENTS.md", role: "operating_instructions", budget: 12_000 },
	{ path: "SOUL.md", budget: 4_000 },
	{ path: "IDENTITY.md", budget: 2_000 },
	{ path: "USER.md", budget: 6_000 },
	{ path: "MEMORY.md", budget: 10_000 },
];

const IDENTITY_PRESETS: Readonly<Record<string, readonly IdentityFileEntry[]>> = {
	minimal: [{ path: "AGENTS.md", role: "operating_instructions", budget: 12_000 }],
	hermes: [
		{ path: "SOUL.md", role: "primary_identity", budget: 4_000 },
		{ path: "AGENTS.md", role: "project_context", budget: 12_000 },
	],
	openclaw: [
		{ path: "AGENTS.md", role: "operating_instructions", budget: 12_000 },
		{ path: "SOUL.md", role: "persona", budget: 4_000 },
		{ path: "IDENTITY.md", role: "agent_identity", budget: 2_000 },
		{ path: "USER.md", role: "user_profile", budget: 6_000 },
		{ path: "MEMORY.md", role: "working_memory", budget: 10_000 },
	],
	custom: [{ path: "AGENTS.md", role: "operating_instructions", budget: 12_000 }],
};

const HEADER_BY_FILE: Readonly<Record<string, string>> = {
	"AGENTS.md": "Agent Instructions",
	"SOUL.md": "Soul",
	"IDENTITY.md": "Identity",
	"USER.md": "About Your User",
	"MEMORY.md": "Working Memory",
};

function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function safeIdentityEntry(value: unknown): IdentityFileEntry | null {
	const record = typeof value === "string" ? { path: value } : asRecord(value);
	const path = typeof record.path === "string" ? record.path.trim() : "";
	if (!path || path.startsWith("/") || path.startsWith("~") || path.split(/[\\/]/).includes("..")) return null;
	if (record.enabled === false) return null;
	const rawBudget = typeof record.budget === "number" ? record.budget : Number.parseInt(String(record.budget ?? ""), 10);
	const budget = Number.isFinite(rawBudget) && rawBudget > 0 ? Math.floor(rawBudget) : undefined;
	return {
		path,
		...(typeof record.role === "string" ? { role: record.role } : {}),
		...(budget ? { budget } : {}),
	};
}

function identityEntries(value: unknown): IdentityFileEntry[] {
	if (!Array.isArray(value)) return [];
	return value.map(safeIdentityEntry).filter((entry): entry is IdentityFileEntry => entry !== null);
}

function identityIsDisabled(config: Record<string, unknown>): boolean {
	const capabilities = asRecord(config.capabilities);
	const capabilityIdentity = asRecord(capabilities.identity);
	const identity = asRecord(config.identity);
	if (capabilityIdentity.mode === "off") return true;
	if (capabilityIdentity.mode === "managed" || capabilityIdentity.mode === "passthrough") return false;
	if (identity.mode === "off") return true;
	if (identity.mode === "managed" || identity.mode === "passthrough") return false;
	return identity.enabled === false;
}

function startupFiles(config: Record<string, unknown>): readonly IdentityFileEntry[] {
	if (identityIsDisabled(config)) return [];
	const identity = asRecord(config.identity);
	const startup = asRecord(identity.startup);
	const configured = identityEntries(startup.load);
	if (configured.length > 0) return configured;
	const presetName = typeof identity.preset === "string" ? identity.preset : "";
	return IDENTITY_PRESETS[presetName] ?? STATIC_IDENTITY_FILES;
}

function identityHeader(entry: IdentityFileEntry): string {
	const filename = entry.path.split(/[\\/]/).pop() ?? entry.path;
	return HEADER_BY_FILE[filename] ?? entry.role ?? filename.replace(/\.md$/i, "");
}

export function readStaticIdentity(agentsDirectory: string, status = STATIC_IDENTITY_OFFLINE_STATUS): string | null {
	if (!existsSync(agentsDirectory)) return null;
	const configPath = join(agentsDirectory, "agent.yaml");
	let config: Record<string, unknown> = {};
	if (existsSync(configPath)) {
		try {
			config = asRecord(parse(readFileSync(configPath, "utf8")));
		} catch {
			config = {};
		}
	}
	const files = startupFiles(config);
	if (files.length === 0) return null;
	const parts: string[] = [];
	for (const entry of files) {
		const path = join(agentsDirectory, entry.path);
		if (!existsSync(path)) continue;
		try {
			const raw = readFileSync(path, "utf8").trim();
			if (!raw) continue;
			const budget = entry.budget ?? STATIC_IDENTITY_FILES.find((file) => file.path === entry.path)?.budget ?? 4_000;
			const content = raw.length <= budget ? raw : `${raw.slice(0, budget)}\n[truncated]`;
			parts.push(`## ${identityHeader(entry)}\n\n${content}`);
		} catch {
			// Static identity is best-effort so a missing or unreadable file cannot fail plugin setup.
		}
	}
	return parts.length > 0 ? `${status}\n\n${parts.join("\n\n")}` : null;
}
