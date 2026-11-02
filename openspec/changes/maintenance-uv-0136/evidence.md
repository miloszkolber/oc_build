# Evidence

On 2026-11-02 the sandbox image was rebuilt with uv 0.13.6. Its build-time image check passed and its inventory reported uv 0.13.6, Bun 1.4.4, Go 1.27.3, Node 22.23.4, pnpm 11.28.8 and OpenSpec 1.15.0.

In offline disposable containers, both `uv run --active --script` and `uv sync --active --script` were run with `VIRTUAL_ENV` set to a nonempty ordinary directory containing a marker file. Both exited 2 with the non-virtualenv refusal and the marker remained intact. These exercise the failure described in [upstream PR 21464](https://github.com/astral-sh/uv/pull/21464).

The documentation checker passed, its nine tests passed, strict OpenSpec validation reported seven items passed, and the rebuilt image's sandbox check passed. Publication and hosted checks remain pending.
