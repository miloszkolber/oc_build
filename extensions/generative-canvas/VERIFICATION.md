# Canvas 0.1.0 verification

Executed on 2026-10-09 against OpenChamber web 2.2.0. This is **MCP Chromium**
evidence, not verification in OpenChamber's native desktop client.

| Boundary | Executed evidence |
| --- | --- |
| Validator and renderer | 23 Bun tests passed, including actual React registry rendering, escaped text, unknown components/props/actions/expressions, graph integrity, limits and source-preserving snapshots |
| Package | SDK manifest parse, production esbuild bundle, full dependency license collection, ZIP round-trip and example CLI validation passed |
| Native host integration | Initially folder-installed, then final ZIP installed through `/api/guests` at `/data/.db/openchamber/extensions/generative-canvas`; approved only `files` through the normal permissions dialog; Canvas appeared on the rail and rendered in OpenChamber's sandboxed full-page iframe; keyboard Space activated the example, Tab/ArrowRight selected 36 months, screenshot confirmed €432/€372 |
| Local controls | Served panel in MCP Chromium: 36 months updates VPS €432 and home server €372; table search retains the matching row; export Blob contains horizon 36 |
| Invalid input | Unknown HTML component rejected; previous valid canvas retained |
| Responsive rendering | Actual 390×844 light/dark viewports inspected; chart/control/table layout fits without page-level horizontal overflow |
| File workflow | Test host used the real SDK bridge and real approved OpenChamber file API in disposable project `/home/core/.cache/generative-canvas-qa`: list, stat, read and unique snapshot write passed; original horizon 12 unchanged, saved horizon 36 |
| Reload | Test-host page reloaded; explicit refresh/load of saved snapshot restored 36-month totals |
| Context switch | Held a read result, switched projects, then released it; new project remained empty, file selection cleared and stale canvas did not render |

The test host is a temporary same-origin fixture so the tools can inspect frame
DOM. Production OpenChamber uses an opaque `allow-scripts` iframe, which correctly
blocks that inspection. Its keyboard interactions were checked separately in
MCP Chromium. File workflow verifies the SDK/file API boundary, **not native
desktop click handling**. No production sandbox was weakened to run checks.

Operator acceptance still needed: reload desktop, open Canvas in panel/full-page,
try the example, load an agent-written file and save/export in the chosen project.
There is no arbitrary HTML/JS execution, MCP Apps adapter or automatic live file
subscription. Table filter/sort is ephemeral; horizon is included in snapshots.
P2–P6 remain paused. Search indexing remains disabled and outside the roadmap.
