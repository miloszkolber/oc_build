# Extensions

This directory holds two different kinds of package. They are installed by different programs and are not interchangeable.

| Directory | Kind | Loaded by |
| --- | --- | --- |
| [`agent-browser/`](agent-browser/README.md) | OpenChamber guest extension | OpenChamber, after the user installs and approves it |
| [`rembric/`](rembric/README.md) | OpenCode V2 plugin | OpenCode, from its plugin configuration |

## Agent Browser

Agent Browser owns one Chromium process, one temporary browser profile and one MCP endpoint. OpenChamber's browser panel and the agent's MCP tools both reach that single owner, so they share tabs, cookies, form values and history, and a human and the agent hand one page back and forth instead of driving two browsers.

It is included in the custom image as a user-installable package at `/opt/openchamber/extensions/agent-browser`. It is not auto-installed or auto-approved: install it in OpenChamber **Settings → Extensions**, review and approve **Run a local service**, then select **Agent Browser** under **Settings → General → OpenChamber Tools → Browser provider**.

Service approval is a trust decision, not an OS sandbox: OpenChamber runs the extension service as its application user with the same mounted-filesystem access as the host process. The browser broker itself is intended to run as a separate container without application mounts or credentials; see the package README for the sidecar recipe.

The package denies private and loopback destinations by default. Grant only an explicitly approved origin or private network through its policy configuration rather than widening the default.

## Rembric

Rembric is an OpenCode plugin, not an OpenChamber extension: it never appears in OpenChamber's extension list and OpenChamber's service approval does not apply to it. See its own README for build and install instructions.
