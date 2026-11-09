# syntax=mirror.gcr.io/docker/dockerfile:1

# Agent dev sandbox: the language/framework toolchains that /repo builds and
# tests need, plus one place for shared caches. Toolchains are copied from
# version-tagged upstream images so the runtime needs no downloader for them;
# Debian apt supplies the OS build basics. This image is deliberately NOT
# distroless: a dev image needs a shell and package managers. Headless browsing
# ships here as a CLI (Obscura + playwright-core), not as a separate image or
# MCP service. Container-image building is out of scope: the sandbox ships no
# Docker CLI, endpoint or build cache.

FROM mirror.gcr.io/oven/bun:1.4.4 AS bun
FROM mirror.gcr.io/library/golang:1.27-bookworm AS go
FROM ghcr.io/astral-sh/uv:0.13.7 AS uv

FROM mirror.gcr.io/library/node:22-bookworm-slim AS sandbox

# Shared, persistent caches. One download serves every repository and every
# run. GOTOOLCHAIN=local forbids Go from silently fetching a second toolchain.
# Ephemeral run state (HOME, TMPDIR, XDG_*) is expected to be a per-run mount.
ENV PATH=/usr/local/go/bin:/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin \
    BUN_INSTALL_CACHE_DIR=/cache/bun \
    npm_config_cache=/cache/npm \
    PNPM_HOME=/cache/pnpm \
    PNPM_STORE_DIR=/cache/pnpm-store \
    GOTOOLCHAIN=local \
    GOPATH=/cache/go \
    GOMODCACHE=/cache/go/mod \
    GOCACHE=/cache/go/build \
    PIP_CACHE_DIR=/cache/pip \
    UV_CACHE_DIR=/cache/uv \
    UV_PYTHON_INSTALL_DIR=/cache/uv/python \
    HOME=/tmp/home \
    TMPDIR=/tmp \
    XDG_CACHE_HOME=/tmp/xdg-cache \
    XDG_CONFIG_HOME=/tmp/xdg-config \
    XDG_DATA_HOME=/tmp/xdg-data \
    XDG_STATE_HOME=/tmp/xdg-state

RUN apt-get update \
    && apt-get install --no-install-recommends -y \
        build-essential pkg-config \
        git openssh-client curl ca-certificates \
        jq ripgrep file unzip zip xz-utils tar patch less procps util-linux \
        python3 python3-venv python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY --from=go /usr/local/go /usr/local/go
COPY --from=uv /uv /usr/local/bin/uv
COPY --from=uv /uvx /usr/local/bin/uvx

RUN npm install --global --no-audit --no-fund pnpm@11.28.11 @fission-ai/openspec@1.16.1 \
    && rm -f /usr/local/bin/pnpm \
    && printf '#!/bin/sh\nexec node /usr/local/lib/node_modules/pnpm/bin/pnpm.mjs --store-dir "${PNPM_STORE_DIR:-/cache/pnpm-store}" "$@"\n' > /usr/local/bin/pnpm \
    && chmod +x /usr/local/bin/pnpm \
    && npm cache clean --force

# Debian login shells source /etc/profile, which rewrites PATH and drops
# /usr/local/go/bin. Re-add it so `bash -l` and `sh -lc` both find Go.
RUN printf 'export PATH=/usr/local/go/bin:$PATH\n' > /etc/profile.d/sandbox-path.sh

# Headless browser: Obscura (Rust, CDP) replaces the separate Chromium MCP
# image. playwright-core adds interaction without downloading a browser.
ARG OBSCURA_VERSION=0.2.6
ARG OBSCURA_SHA256=eed986e478c5ec5439f531f2d7fb6b0e36a356f1df7a6c44a8e8fd4f2486bd76
RUN set -eu; \
    curl -fsSL -o /tmp/obscura.tgz "https://github.com/h4ckf0r0day/obscura/releases/download/v${OBSCURA_VERSION}/obscura-x86_64-linux.tar.gz"; \
    printf '%s  /tmp/obscura.tgz\n' "$OBSCURA_SHA256" | sha256sum --check --status; \
    tar -xzf /tmp/obscura.tgz -C /usr/local/bin obscura obscura-worker; \
    chmod 0755 /usr/local/bin/obscura /usr/local/bin/obscura-worker; \
    rm /tmp/obscura.tgz; \
    mkdir -p /usr/local/share/licenses/obscura; \
    curl -fsSL -o /usr/local/share/licenses/obscura/LICENSE "https://raw.githubusercontent.com/h4ckf0r0day/obscura/v${OBSCURA_VERSION}/LICENSE"; \
    test -s /usr/local/share/licenses/obscura/LICENSE

RUN set -eu; \
    mkdir -p /opt/browser; \
    cd /opt/browser; \
    printf '{"name":"sandbox-browser","private":true,"type":"module"}\n' > package.json; \
    npm install --omit=dev --no-audit --no-fund playwright-core@1.65.0; \
    npm cache clean --force; \
    cp node_modules/playwright-core/LICENSE /usr/local/share/licenses/playwright-core-LICENSE

COPY browser-cli.mjs /opt/browser/cli.mjs
RUN chmod 0755 /opt/browser/cli.mjs && ln -s /opt/browser/cli.mjs /usr/local/bin/browser

COPY check-image.sh /usr/local/share/sandbox/check-image.sh
COPY README.md /usr/share/sandbox/README.md
RUN --network=none bash /usr/local/share/sandbox/check-image.sh

RUN printf '%s\n' \
    "bun $(bun --version)" \
    "go $(go version | awk '{print $3}')" \
    "node $(node --version)" \
    "npm $(npm --version)" \
    "pnpm $(pnpm --version)" \
    "python3 $(python3 --version | awk '{print $2}')" \
    "uv $(uv --version | awk '{print $2}')" \
    "openspec $(OPENSPEC_TELEMETRY=0 openspec --version)" \
    "obscura $(obscura --version | awk '{print $2}')" \
    "playwright-core $(cd /opt/browser && node -p "require('playwright-core/package.json').version")" \
    > /usr/local/share/sandbox/sandbox-build.txt

USER 1000:1000
WORKDIR /repo
CMD ["/bin/bash", "-l"]
