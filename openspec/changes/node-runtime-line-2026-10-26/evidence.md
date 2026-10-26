# Evidence

Executed 2026-10-26 on the host Docker runtime. The branch changes only the two runtime (`FROM ... AS app` / `AS browser`) lines and the two check assertions.

## App image

```
$ docker build -t openchamber:check-node24 --build-arg OPENCHAMBER_VERSION=2.5.2 docker/openchamber
exit 0
$ docker run --rm --interactive --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --tmpfs /tmp:exec,size=512m,mode=1777 --shm-size=512m \
    --env EXPECTED_VERSION=2.5.2 --entrypoint node openchamber:check-node24 \
    --input-type=module < docker/openchamber/check-image.mjs
App image passed: upstream web app, Git/shell, no Chromium or archived extension
$ docker run --rm --entrypoint node openchamber:check-node24 -e 'console.log(process.version)'
v24.14.0
```

## Browser image

The first run failed on the unchanged `'22'` assertion in `docker/browser/check-image.mjs` (`'24' !== '22'`), which is the check catching the line change rather than a defect. After updating both assertions:

```
$ docker build -t openchamber-browser:check-node24 docker/browser
exit 0
$ docker run ... --entrypoint node openchamber-browser:check-node24 --input-type=module < docker/browser/check-image.mjs
Standalone browser image passed: Chromium 156.0.8078.47, 38 MCP tools, responsive layout/color preference/navigation/screenshot/auth/policy; no extension or surface API
```

## Image sizes

| Image | Node 22 (current) | Node 24 (proposed) | Delta |
| --- | --- | --- | --- |
| App | 138,631,009 bytes | 138,816,581 bytes | +185,572 |
| Browser | 248,247,737 bytes | 248,433,424 bytes | +185,687 |

## Not executed

- A running app against OpenCode 2.1.4 under Node 24.
- WebAuthn/passkey, TTS and long-lived terminal sessions.
- The browser MCP's policy proxy and idle expiry over time.
