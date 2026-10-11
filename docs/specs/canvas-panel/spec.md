# Canvas panel specification

## Purpose

Canvas is an OpenChamber panel extension that presents agent-authored data in a
conversation. One conversation owns one canvas, the agent owns the JSON file,
and the panel is a read-only presentation surface. Its contract is that JSON
never supplies code, that the panel never shows raw JSON to the user, and that
the panel never writes the agent's file.

Source of truth for the component catalog and install steps:
[`extensions/canvas/README.md`](../../../extensions/canvas/README.md).

## Requirements

### Requirement: One canvas per conversation

The panel SHALL render exactly the canvas of the conversation currently selected
in OpenChamber.

#### Scenario: File location

- GIVEN a conversation with session id `ses_abc123`
- WHEN the panel looks for its canvas
- THEN it reads `/data/.db/openchamber/canvas/ses_abc123.canvas.json`

#### Scenario: Unusual session identifiers

- GIVEN a session id that is not a safe filename segment
- WHEN the panel derives the filename
- THEN it reads `session-<16 hex>.canvas.json` using a deterministic FNV-1a hash
- AND `src/session.js` is the single source of truth for the derivation

#### Scenario: Subagent sessions

- GIVEN a subagent runs in a child session and the `sessions` capability is granted
- WHEN the panel resolves the current session's ancestors once per conversation switch
- THEN it shows the top-level conversation's canvas
- AND the agent request draft targets that same resolved file

#### Scenario: Ancestor lookup unavailable

- GIVEN the `sessions` capability is not granted or the ancestor lookup fails
- WHEN the panel resolves a canvas
- THEN it falls back to the current session's own file
- AND no error is shown for the fallback itself

#### Scenario: Nothing else is read

- GIVEN other files exist in the canvas directory
- WHEN the panel renders
- THEN it reads only the resolved conversation file

### Requirement: Read-only presentation

The panel SHALL present the canvas and never modify the agent's file.

#### Scenario: No write path

- GIVEN the panel is open and a user interacts with it
- WHEN any interaction happens
- THEN the panel does not write, rename or delete the canvas file

#### Scenario: No JSON exposure

- GIVEN the panel renders a canvas
- WHEN the user looks at the panel
- THEN raw JSON is never displayed
- AND no toolbar, export or copy-JSON control is offered

#### Scenario: Local interaction only

- GIVEN a user sorts a table, searches or expands a horizon control
- WHEN the interaction completes
- THEN the change is local and transient, and a reload restores the file's content

### Requirement: Agent-authored JSON contract

The canvas file SHALL be a UTF-8 JSON document with a fixed top-level shape.

#### Scenario: Document shape

- GIVEN an agent writes a canvas file
- WHEN the panel parses it
- THEN it contains exactly `catalog_version: "1"`, `title`, and `spec` with `root` and `elements`
- AND each element has `type`, `props` and optional `children`

#### Scenario: Atomic replacement

- GIVEN an agent needs to update a canvas
- WHEN it writes the file
- THEN it prefers a temporary file followed by a rename so a reader never sees a partial document

#### Scenario: Bound

- GIVEN a canvas file
- WHEN it is larger than 256 KiB of UTF-8
- THEN it fails explicitly rather than being truncated or partially rendered

### Requirement: Structural validation

The panel SHALL reject a document it cannot safely render, and SHALL name what
it rejected.

#### Scenario: Rejected constructs

- GIVEN a canvas file
- WHEN it contains unknown component types or props, actions, expressions, events, an invalid element graph, out-of-range numbers or malformed table rows
- THEN the panel rejects it and reports the reason

#### Scenario: Last good rendering preserved

- GIVEN a conversation previously rendered a valid canvas
- WHEN a later write produces invalid JSON
- THEN an error notice appears
- AND the last good rendering for that conversation is kept on screen

#### Scenario: Missing file

- GIVEN a conversation has no canvas file
- WHEN the panel renders
- THEN the canvas is empty and this is not an error

#### Scenario: Read failure

- GIVEN a read fails for a reason other than absence
- WHEN the panel renders
- THEN a floating notice appears
- AND the canvas does not move

### Requirement: Catalog-driven vocabulary

The component vocabulary SHALL be defined once in `src/catalog.js` and generated
into the artifacts that advertise it.

#### Scenario: Generated inventory

- GIVEN the build runs
- WHEN artifacts are emitted
- THEN `dist/catalog.json` is the authoritative component inventory
- AND the generated agent contract and the panel's request field list the same set

#### Scenario: Catalog contents

- GIVEN catalog version 1
- WHEN its groups are read
- THEN it covers layout, content, data and status, charts, collections, and diagram and quick tools

#### Scenario: Display components only

- GIVEN the catalog
- WHEN it is inspected for actions or inputs
- THEN none are present, because Canvas defines display components only and no actions, which keeps canvases read-only

#### Scenario: Backward compatibility

- GIVEN catalog version 1 and a file written against catalog 0.1.0 or 0.2.0
- WHEN the panel parses it
- THEN the components remain compatible

#### Scenario: Retired global files

- GIVEN canvas files from older global Canvas versions exist in the directory
- WHEN the panel renders
- THEN those files stay on disk untouched and are not displayed
- AND no other file in the directory is deleted

### Requirement: Host theme derivation

The panel SHALL derive its appearance entirely from the host theme variables
written by `applyHostReady`.

#### Scenario: Token source

- GIVEN the panel mounts in OpenChamber
- WHEN `applyHostReady` publishes the theme
- THEN the panel uses the host tokens for background, foreground, elevated surface, muted text, border, hover, primary, radius, font and the status colours with their text aliases

#### Scenario: Visual parity

- GIVEN a canvas is rendered in the app
- WHEN it is compared with the app's own panels
- THEN cards, tables, badges and controls share the same radius, borders and type scale
- AND the panel root type size matches the app's 14 px base

#### Scenario: Diagram theming

- GIVEN a Mermaid diagram in a canvas
- WHEN it renders in light and in dark mode
- THEN its colours derive from the same host tokens
- AND every supported diagram family is themed, including the object-shaped families

#### Scenario: Own chrome

- GIVEN the panel renders its empty state, error notice and controls
- WHEN they are compared with the app's controls
- THEN they match the app's control metrics and focus treatment rather than embedding an imperative UI kit

### Requirement: Refresh and staleness handling

The panel SHALL keep its rendering current without misrouting a late response
after a conversation switch.

#### Scenario: Refresh triggers

- GIVEN the panel is visible
- WHEN three seconds elapse, the window gains focus, or the conversation switches
- THEN the panel re-reads the session file

#### Scenario: Late reads discarded

- GIVEN the user switches from conversation A to conversation B
- WHEN an in-flight read for A completes after the switch
- THEN that result is discarded and never rendered

### Requirement: Agent discovery

Because OpenChamber extensions cannot contribute skills or instruction files,
the panel SHALL advertise itself through the surfaces it can reach, and the
repository SHALL provide the agent-facing instruction surface separately.

#### Scenario: Request field

- GIVEN a conversation with no canvas
- WHEN the empty state renders
- THEN it shows the full contract, the component list and the exact file path as a read-only field that can be copied or inserted into the composer

#### Scenario: No toolbar dependency

- GIVEN the panel is open
- WHEN a user looks for a way to start
- THEN the request field lives only in the empty state, because the panel deliberately exposes no toolbar of its own

#### Scenario: Slash commands not used

- GIVEN the extension manifest could contribute a command or action
- WHEN the manifest is inspected
- Then none is declared, because a slash command resolves to an attach chip rather than a prompt and cannot carry the contract cleanly

#### Scenario: Instruction surface

- GIVEN an agent that reads instructions
- WHEN it needs to know Canvas exists
- Then the workspace agent guidance skills state the file path pattern, the catalog components and that the result is hidden in the Canvas panel rather than written in chat

### Requirement: Service and permission surface

The panel SHALL request only the permissions it needs and SHALL run no
background service.

#### Scenario: Granted capabilities

- GIVEN the installed extension
- WHEN its manifest is inspected
- THEN it declares the `sessions` capability
- AND it declares a filesystem scope of `/data/.db/openchamber/canvas/**`

#### Scenario: Scope cannot be widened

- GIVEN a symlink inside the granted directory points elsewhere
- WHEN the panel resolves a path
- THEN canonical paths are compared so the granted scope is not widened

#### Scenario: No service, page or network authority

- GIVEN the installed extension
- WHEN its runtime surface is inspected
- THEN there is no extension service, background process, model key, generated-code execution path, page surface or network authority

### Requirement: Served preview

The repository SHALL provide a way to review every component outside the
desktop client.

#### Scenario: Live gallery

- GIVEN a reviewer runs the preview command in `extensions/canvas`
- WHEN the served page opens
- THEN it renders the real Canvas with host-like tokens in light and dark
- AND it shows every component in the catalog

#### Scenario: Example files

- GIVEN the build runs
- WHEN examples are emitted
- THEN `dist/examples/gallery.canvas.json` covers every component once
- AND `dist/examples/cost-explorer.canvas.json` covers the interactive tools
- AND each emitted example validates

### Requirement: Verification boundary

Canvas checks SHALL be reported as MCP Chromium checks until the operator
accepts the panel in the native desktop client.

#### Scenario: Executed checks

- GIVEN a Canvas release
- WHEN its verification is reported
- THEN it names the tests that ran and the review viewport and theme used in MCP Chromium
- AND it does not claim native desktop acceptance

#### Scenario: Desktop acceptance

- GIVEN the native desktop client
- WHEN the operator has not confirmed the panel there
- Then the change that tracks that confirmation stays open
- And its status is stated as awaiting operator acceptance

### Requirement: Recovery

Canvas data SHALL survive an extension upgrade and a project deletion.

#### Scenario: Backup and restore

- GIVEN the canvas directory holds authored canvases
- WHEN it is backed up with app data and later restored
- Then files keep their exact names so the panel finds them again

#### Scenario: Upgrade path

- GIVEN a Canvas upgrade
- When it is prepared
- Then the prior ZIP or installed directory and a data backup are retained
- And the store is independent of extension installation and project deletion
