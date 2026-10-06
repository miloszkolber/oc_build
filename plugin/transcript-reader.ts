import { Buffer } from "node:buffer";
import type { FetchLike } from "./daemon-client.js";

const DEFAULT_SERVER_PORT = 4096;
const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGES = 50;
const MAX_MESSAGES = DEFAULT_PAGE_SIZE * MAX_PAGES;
const MAX_TRANSCRIPT_CHARS = 2_000_000;
const MAX_PAGE_BYTES = 4_000_000;
const TRANSCRIPT_TIMEOUT_MS = 15_000;

export interface TranscriptReaderOptions {
	readonly baseUrl?: string;
	readonly trustedOrigin?: string;
	readonly env?: Record<string, string | undefined>;
	readonly fetchImpl?: FetchLike;
	readonly timeoutMs?: number;
	readonly pageSize?: number;
	readonly maxPages?: number;
	readonly maxMessages?: number;
	readonly maxChars?: number;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function readString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function isLoopbackHost(hostname: string): boolean {
	const host = hostname.toLowerCase();
	if (host === "localhost" || host === "[::1]" || host === "::1") return true;
	const octets = host.split(".").map((octet) => Number(octet));
	return (
		octets.length === 4 &&
		octets[0] === 127 &&
		octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255)
	);
}

function resolveTrustedOrigin(configured: string | undefined): string | null {
	if (!configured?.trim()) return null;
	try {
		const url = new URL(configured.trim());
		if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
			return null;
		}
		return url.origin;
	} catch {
		return null;
	}
}

function resolveBaseUrl(
	configured: string | undefined,
	env: Record<string, string | undefined>,
	trustedOrigin: string | undefined,
): string | null {
	const raw = configured?.trim();
	if (raw) {
		try {
			const url = new URL(raw);
			if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.search || url.hash) {
				return null;
			}
			const localHost = isLoopbackHost(url.hostname);
			if (url.protocol === "http:" && !localHost) return null;
			if (!localHost && (url.protocol !== "https:" || resolveTrustedOrigin(trustedOrigin) !== url.origin)) return null;
			return url.toString().replace(/\/$/, "");
		} catch {
			return null;
		}
	}

	const rawPort = env.OPENCODE_PORT;
	const port = rawPort === undefined ? DEFAULT_SERVER_PORT : /^\d+$/.test(rawPort) ? Number(rawPort) : Number.NaN;
	if (!Number.isInteger(port) || port < 1 || port > 65_535) return null;
	return `http://127.0.0.1:${port}`;
}

function transcriptText(message: Record<string, unknown>): string[] {
	if (message.type === "user" && typeof message.text === "string") return [message.text];
	if (message.type !== "assistant" || !Array.isArray(message.content)) return [];
	return message.content.flatMap((part) => {
		const record = asRecord(part);
		return record?.type === "text" && typeof record.text === "string" ? [record.text] : [];
	});
}

function cleanTranscriptText(value: string): string {
	// The V2 request hooks inject into transient drafts, not persisted history.
	// Stored text has no provenance that would distinguish user-authored fences.
	return value.trim().replace(/\s*\r?\n\s*/g, " ");
}

async function readBoundedJson(response: Response): Promise<unknown> {
	const rawLength = response.headers.get("content-length");
	if (rawLength && /^\d+$/.test(rawLength) && Number(rawLength) > MAX_PAGE_BYTES) {
		throw new RangeError("OpenCode transcript page exceeded its byte limit");
	}
	if (!response.body) {
		const text = await response.text();
		if (new TextEncoder().encode(text).byteLength > MAX_PAGE_BYTES) {
			throw new RangeError("OpenCode transcript page exceeded its byte limit");
		}
		return JSON.parse(text) as unknown;
	}

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let totalBytes = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			if (!value) continue;
			totalBytes += value.byteLength;
			if (totalBytes > MAX_PAGE_BYTES) {
				await reader.cancel();
				throw new RangeError("OpenCode transcript page exceeded its byte limit");
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(totalBytes);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export function createTranscriptReader(options: TranscriptReaderOptions = {}): (sessionID: string) => Promise<string | null> {
	const env = options.env ?? process.env;
	const baseUrl = resolveBaseUrl(options.baseUrl, env, options.trustedOrigin);
	const fetchImpl = options.fetchImpl ?? globalThis.fetch;
	const username = env.OPENCODE_SERVER_USERNAME?.trim() || "opencode";
	const password = env.OPENCODE_SERVER_PASSWORD;
	const pageSize = Math.max(1, Math.min(options.pageSize ?? DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE));
	const maxPages = Math.max(1, Math.min(options.maxPages ?? MAX_PAGES, MAX_PAGES));
	const maxMessages = Math.max(1, Math.min(options.maxMessages ?? MAX_MESSAGES, MAX_MESSAGES));
	const maxChars = Math.max(1, Math.min(options.maxChars ?? MAX_TRANSCRIPT_CHARS, MAX_TRANSCRIPT_CHARS));
	const timeoutMs = Math.max(1_000, Math.min(options.timeoutMs ?? TRANSCRIPT_TIMEOUT_MS, TRANSCRIPT_TIMEOUT_MS));

	return async (sessionID) => {
		if (!baseUrl || !password || !sessionID) return null;
		const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
		const signal = AbortSignal.timeout(timeoutMs);
		const lines: string[] = [];
		const seenCursors = new Set<string>();
		let characters = 0;
		let messageCount = 0;
		let cursor: string | undefined;

		for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
			const url = new URL(`${baseUrl}/api/session/${encodeURIComponent(sessionID)}/message`);
			url.searchParams.set("limit", String(pageSize));
			if (cursor) url.searchParams.set("cursor", cursor);
			else url.searchParams.set("order", "asc");

			let payload: unknown;
			try {
				const response = await fetchImpl(url, {
					method: "GET",
					headers: { Accept: "application/json", Authorization: authorization },
					redirect: "error",
					signal,
				});
				if (!response.ok) return null;
				payload = await readBoundedJson(response);
			} catch {
				return null;
			}

			const page = asRecord(payload);
			if (!page || !Array.isArray(page.data)) return null;
			messageCount += page.data.length;
			if (messageCount > maxMessages) return null;

			for (const value of page.data) {
				const message = asRecord(value);
				if (!message) return null;
				const role = message.type === "user" ? "User" : message.type === "assistant" ? "Assistant" : "";
				if (!role) continue;
				for (const candidate of transcriptText(message)) {
					const text = cleanTranscriptText(candidate);
					if (!text) continue;
					const line = `${role}: ${text}`;
					characters += line.length + 1;
					if (characters > maxChars) return null;
					lines.push(line);
				}
			}

			const pageCursor = asRecord(page.cursor);
			if (!pageCursor) return null;
			if (pageCursor.next === undefined || pageCursor.next === null) {
				return lines.length ? lines.join("\n") : null;
			}
			if (typeof pageCursor.next !== "string" || pageCursor.next.length === 0) return null;
			const next = pageCursor.next;
			if (seenCursors.has(next)) return null;
			seenCursors.add(next);
			cursor = next;
		}

		// Never submit a truncated transcript as if it were complete.
		return null;
	};
}
