export type DaemonPoster = (path: string, body: Record<string, unknown>, timeoutMs: number) => Promise<unknown | null>;

export type DaemonPostFailure = "offline" | "timeout" | "http" | "invalid-json";

export type DaemonPostResult =
	| { readonly ok: true; readonly data: unknown }
	| { readonly ok: false; readonly reason: DaemonPostFailure };

export type DaemonPostResultFetcher = (
	path: string,
	body: Record<string, unknown>,
	timeoutMs: number,
) => Promise<DaemonPostResult>;

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isTimeoutError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const name = Reflect.get(error, "name");
	const code = Reflect.get(error, "code");
	return name === "AbortError" || name === "TimeoutError" || code === "ABORT_ERR";
}

export function createDaemonPostResultFetcher(
	baseUrl: string,
	fetchImpl: FetchLike = globalThis.fetch,
	env: Record<string, string | undefined> = process.env,
): DaemonPostResultFetcher {
	const daemonUrl = baseUrl.replace(/\/$/, "");

	return async (path, body, timeoutMs) => {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			"x-signet-runtime-path": "plugin",
			"x-signet-actor": "opencode-plugin",
			"x-signet-actor-type": "harness",
		};
		const token = env.SIGNET_API_KEY?.trim() || env.SIGNET_TOKEN?.trim();
		if (token) headers.Authorization = `Bearer ${token}`;

		try {
			const response = await fetchImpl(`${daemonUrl}${path}`, {
				method: "POST",
				headers,
				body: JSON.stringify(body),
				redirect: "error",
				signal: AbortSignal.timeout(timeoutMs),
			});
			if (!response.ok) return { ok: false, reason: "http" };
			try {
				return { ok: true, data: JSON.parse(await response.text()) as unknown };
			} catch (error) {
				return { ok: false, reason: isTimeoutError(error) ? "timeout" : "invalid-json" };
			}
		} catch (error) {
			return { ok: false, reason: isTimeoutError(error) ? "timeout" : "offline" };
		}
	};
}

export function createDaemonPoster(
	baseUrl: string,
	fetchImpl: FetchLike = globalThis.fetch,
	env: Record<string, string | undefined> = process.env,
): DaemonPoster {
	const result = createDaemonPostResultFetcher(baseUrl, fetchImpl, env);
	return async (path, body, timeoutMs) => {
		const response = await result(path, body, timeoutMs);
		return response.ok ? response.data : null;
	};
}
