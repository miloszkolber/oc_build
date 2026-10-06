const INTERNAL_FENCE_NAMES = ["signet-memory-context", "signet-memory", "memory-context"] as const;

interface FenceMatch {
	readonly index: number;
	readonly end: number;
}

function isFenceWhitespace(character: string | undefined): boolean {
	return character === " " || character === "\t" || character === "\r" || character === "\n";
}

function readFenceName(text: string, start: number): (typeof INTERNAL_FENCE_NAMES)[number] | undefined {
	for (const name of INTERNAL_FENCE_NAMES) {
		if (text.slice(start, start + name.length).toLowerCase() === name) return name;
	}
	return undefined;
}

type ParsedFence = { readonly kind: "open" | "close"; readonly end: number } | { readonly incomplete: true };

function parseFenceAt(text: string, index: number): ParsedFence | undefined {
	if (text[index] !== "<") return undefined;

	let cursor = index + 1;
	if (text[cursor] === "\\") cursor += 1;
	while (isFenceWhitespace(text[cursor])) cursor += 1;

	const isClose = text[cursor] === "/";
	if (isClose) cursor += 1;
	while (isFenceWhitespace(text[cursor])) cursor += 1;

	const name = readFenceName(text, cursor);
	if (!name) return undefined;
	const afterName = cursor + name.length;
	const boundary = text[afterName];
	if (!isClose && !isFenceWhitespace(boundary) && boundary !== "/" && boundary !== ">") return undefined;

	cursor = afterName;
	if (isClose) {
		while (isFenceWhitespace(text[cursor])) cursor += 1;
		if (text[cursor] === ">") return { kind: "close", end: cursor + 1 };
		return cursor >= text.length ? { incomplete: true } : undefined;
	}

	let quote: '"' | "'" | undefined;
	while (cursor < text.length) {
		const character = text[cursor];
		if (quote) {
			if (character === quote) quote = undefined;
		} else if (character === '"' || character === "'") {
			quote = character;
		} else if (character === ">") {
			return { kind: "open", end: cursor + 1 };
		}
		cursor += 1;
	}
	return { incomplete: true };
}

function findNextFence(
	text: string,
	startIndex = 0,
): { readonly kind: "open" | "close"; readonly match: FenceMatch } | undefined {
	for (let index = startIndex; index < text.length; index += 1) {
		if (text[index] !== "<") continue;
		const parsed = parseFenceAt(text, index);
		if (!parsed) continue;
		if ("incomplete" in parsed) return { kind: "open", match: { index, end: text.length } };
		return { kind: parsed.kind, match: { index, end: parsed.end } };
	}
	return undefined;
}

export function escapeMemoryContextForFence(text: string): string {
	let output = "";
	let cursor = 0;
	let next = findNextFence(text);
	while (next) {
		output += text.slice(cursor, next.match.index);
		output += `&lt;${text.slice(next.match.index + 1, next.match.end)}`;
		cursor = next.match.end;
		next = findNextFence(text, cursor);
	}
	return output + text.slice(cursor);
}

export function wrapMemoryContext(context: string, source = "api-context"): string {
	const clean = escapeMemoryContextForFence(context).trim();
	if (!clean) return "";
	const safeSource = source.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 40) || "api-context";
	return `<signet-memory source="${safeSource}">\n${clean}\n</signet-memory>`;
}

export function composeApiUserContent(userContent: string, dynamicContext: string): string {
	const contextBlock = wrapMemoryContext(dynamicContext);
	if (!contextBlock) return userContent;
	return `${userContent}\n\n${contextBlock}`;
}
