# syntax=docker/dockerfile:1

# Prepared for the OpenChamber v2.0.1 release. Pass "latest" to resolve the
# newest GitHub release at build time, or another exact version to rebuild it.
# Base images and npm dependencies remain mutable: this is not bit-reproducible.
ARG OPENCHAMBER_VERSION=2.0.1

# Baked web bundle: the GitHub release tarball plus production
# dependencies. Nothing is installed or updated at container runtime, so
# updates happen by rebuilding the image.
FROM node:22-bookworm-slim AS openchamber-package

ARG OPENCHAMBER_VERSION
ARG OPENCHAMBER_ASSET_SHA256=""

RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates curl patch \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/openchamber

COPY assets/disable-self-update.patch /tmp/disable-self-update.patch

RUN set -eu; \
    version="${OPENCHAMBER_VERSION}"; \
    if [ "$version" = "latest" ]; then \
        version="$(node -e "fetch(process.argv[1],{headers:{'User-Agent':'openchamber-image-build'}}).then(r=>{if(!r.ok)process.exit(1);return r.json()}).then(j=>console.log(String(j.tag_name||'').replace(/^v/,''))).catch(()=>process.exit(1))" 'https://api.github.com/repos/openchamber/openchamber/releases/latest')"; \
    fi; \
    node -e 'const [v,h]=process.argv.slice(1); if(!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(v)||!/^([a-f0-9]{64})?$/.test(h)) process.exit(1)' "$version" "$OPENCHAMBER_ASSET_SHA256"; \
    echo "[openchamber] building web bundle $version"; \
    curl --fail --location --retry 3 \
        --output /tmp/openchamber.tgz \
        "https://github.com/openchamber/openchamber/releases/download/v${version}/openchamber-web-${version}.tgz" \
    && if [ -n "$OPENCHAMBER_ASSET_SHA256" ]; then \
        printf '%s  /tmp/openchamber.tgz\n' "$OPENCHAMBER_ASSET_SHA256" | sha256sum --check --status; \
    fi \
    && tar -xzf /tmp/openchamber.tgz --strip-components=1 \
    && rm /tmp/openchamber.tgz \
    && test "$(node -e 'console.log(require("./package.json").version)')" = "$version" \
    && patch --batch --forward --fuzz=0 -p1 < /tmp/disable-self-update.patch \
    && npm install -g npm@12 --no-audit --no-fund \
    && npm install --omit=dev --ignore-scripts --no-audit --no-fund \
    && rm -rf /tmp/* /root/.npm

FROM node:22-bookworm-slim

ARG OPENCHAMBER_VERSION

LABEL org.opencontainers.image.title="openchamber" \
      org.opencontainers.image.description="OpenChamber web interface (baked release, external OpenCode server)" \
      org.opencontainers.image.source="https://github.com/openchamber/openchamber" \
      org.opencontainers.image.version="${OPENCHAMBER_VERSION}"

RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates git \
    && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/* \
    && if getent passwd 1000 >/dev/null; then \
        existing_user=$(getent passwd 1000 | cut -d: -f1); \
        if [ "$existing_user" != "openchamber" ]; then \
            existing_group=$(getent group 1000 | cut -d: -f1); \
            if [ -n "$existing_group" ] && [ "$existing_group" != "openchamber" ]; then \
                groupmod -n openchamber "$existing_group"; \
            fi; \
            usermod -l openchamber -d /home/openchamber -m "$existing_user"; \
        fi; \
    else \
        getent group 1000 >/dev/null || groupadd --gid 1000 openchamber; \
        useradd --uid 1000 --gid 1000 --create-home --home-dir /home/openchamber --shell /bin/sh openchamber; \
    fi \
    && install -d -o openchamber -g openchamber /home/openchamber/.config/openchamber

ENV HOME=/home/openchamber \
    NODE_ENV=production

WORKDIR /opt/openchamber

COPY --from=openchamber-package /opt/openchamber/package.json ./package.json
COPY --from=openchamber-package /opt/openchamber/node_modules/ ./node_modules/
COPY --from=openchamber-package /opt/openchamber/bin/ ./bin/
COPY --from=openchamber-package /opt/openchamber/server/ ./server/
COPY --from=openchamber-package /opt/openchamber/dist/ ./dist/
COPY --chmod=0755 assets/entrypoint.sh /usr/local/bin/openchamber-entrypoint
COPY assets/licenses/openchamber-LICENSE /usr/share/licenses/openchamber/LICENSE

USER openchamber
WORKDIR /home/openchamber

ENTRYPOINT ["/usr/local/bin/openchamber-entrypoint"]
