# Evidence

The [2.0.0 release](https://github.com/Fission-AI/OpenSpec/releases/tag/v2.0.0) removes generated slash commands and moves generated skills to a shared location. The [1.16.1 to 2.0.0 comparison](https://github.com/Fission-AI/OpenSpec/compare/v1.16.1...v2.0.0) contains 11 commits and changes update/configuration code. The package manifest retains the Node >=22.12.0 requirement, met by the sandbox. The repository uses its own OpenSpec files and does not require generated commands.

OpenSpec 2.0.0 strict validation passed before the change. The rebuilt sandbox passed its offline image check as UID 1000. The documentation checker, nine tests and strict validation passed using the rebuilt image. No host skill update or installation was executed.
