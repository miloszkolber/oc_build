# syntax=mirror.gcr.io/docker/dockerfile:1

# Agent dev sandbox: the language/framework toolchains that /repo builds and
# tests need, plus one place for shared caches. Toolchains are copied from
# version-tagged upstream images so the runtime needs no downloader for them;
# Debian apt supplies the OS build basics. This image is deliberately NOT
# distroless: a dev image needs a shell and package managers. The browser image
# stays distroless and separate.

FROM mirror.gcr.io/oven/bun:1.4.2 AS bun
FROM mirror.gcr.io/library/golang:1.25-bookworm AS go
FROM ghcr.io/astral-sh/uv:0.13.0 AS uv
FROM mirror.gcr.io/library/docker:29-cli AS dockercli

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
COPY --from=dockercli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=dockercli /usr/local/libexec/docker/cli-plugins /usr/local/libexec/docker/cli-plugins

RUN npm install --global --no-audit --no-fund pnpm@11.1.2 @fission-ai/openspec@1.14.1 \
    && rm -f /usr/local/bin/pnpm \
    && printf '#!/bin/sh\nexec node /usr/local/lib/node_modules/pnpm/bin/pnpm.mjs --store-dir "${PNPM_STORE_DIR:-/cache/pnpm-store}" "$@"\n' > /usr/local/bin/pnpm \
    && chmod +x /usr/local/bin/pnpm \
    && npm cache clean --force

# Debian login shells source /etc/profile, which rewrites PATH and drops
# /usr/local/go/bin. Re-add it so `bash -l` and `sh -lc` both find Go.
RUN printf 'export PATH=/usr/local/go/bin:$PATH\n' > /etc/profile.d/sandbox-path.sh

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
    "docker $(docker --version | awk '{print $3}' | tr -d ,)" \
    "openspec $(OPENSPEC_TELEMETRY=0 openspec --version)" \
    > /usr/local/share/sandbox/sandbox-build.txt

USER 1000:1000
WORKDIR /repo
CMD ["/bin/bash", "-l"]
