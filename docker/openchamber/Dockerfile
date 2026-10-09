# syntax=docker/dockerfile:1

# Release to bake in. Override for a specific version; "latest" resolves the
# newest upstream GitHub release at build time.
ARG OPENCHAMBER_VERSION=2.1.1

# --- stage 1: download and prepare the upstream web bundle ---------------------
FROM node:22-bookworm-slim AS bundle

ARG OPENCHAMBER_VERSION
ARG OPENCHAMBER_ASSET_SHA256=""

RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates curl patch \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/openchamber
COPY self-update.patch /tmp/self-update.patch
COPY home-repository.patch /tmp/home-repository.patch

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
    && patch --batch --forward --fuzz=0 -p1 < /tmp/self-update.patch \
    && patch --batch --forward --fuzz=0 -p1 < /tmp/home-repository.patch \
    && npm install -g npm@12 --no-audit --no-fund \
    && npm install --omit=dev --ignore-scripts --no-audit --no-fund \
    && rm -rf /tmp/* /root/.npm


# --- stage 2: the few host tools OpenChamber actually uses ---------------------
# Collected with their shared-library closure so the runtime stage needs no
# package manager. bash keeps the web terminal usable; git backs source control.
FROM oven/bun:1.4.2 AS bun-runtime

FROM debian:bookworm-slim AS tools

RUN apt-get update \
    && apt-get install --no-install-recommends -y \
        bash git busybox openssh-client procps ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=bun-runtime /usr/local/bin/bun /usr/local/bin/bun

# Exercise the real shell entrypoint with only its Bun-backed node shim on PATH.
COPY entrypoint.sh entrypoint.test.mjs /tmp/entrypoint-regression/
RUN --network=none bun /tmp/entrypoint-regression/entrypoint.test.mjs

# cp --parents with absolute /bin, /usr sources only resolves the symlinked
# Debian /usr layout correctly from the filesystem root.
WORKDIR /

RUN set -eu; \
    mkdir -p /rootfs; \
    rootfs=/rootfs; \
    copy_with_libs() { \
        cp -a --parents "$1" "$rootfs"; \
        ldd "$1" | grep -oE '/[^ ]+\.so[^ ]*' | sort -u | while read -r lib; do \
            [ -e "$lib" ] || continue; \
            mkdir -p "$rootfs$(dirname "$lib")"; \
            cp -aL "$lib" "$rootfs$lib"; \
        done; \
    }; \
    copy_with_libs /bin/bash; \
    copy_with_libs /usr/bin/git; \
    copy_with_libs /usr/bin/busybox; \
    copy_with_libs /usr/bin/ssh; \
    copy_with_libs /usr/bin/ps; \
    mkdir -p /rootfs/bin /rootfs/usr/bin; \
    ln -s /usr/bin/ps /rootfs/bin/ps; \
    for command in env ls cat cp mv rm mkdir rmdir touch head tail grep sed awk find xargs sort cut wc tr tee dirname basename readlink date sleep timeout kill ln stat chmod du df expr uname hostname id tar; do \
        ln -s busybox "/rootfs/usr/bin/$command"; \
    done; \
    mkdir -p /rootfs/etc; \
    printf 'root:x:0:0:root:/root:/sbin/nologin\nnobody:x:65534:65534:nobody:/nonexistent:/sbin/nologin\nnonroot:x:65532:65532:nonroot:/home/nonroot:/sbin/nologin\ncore:x:1000:1000:Core runtime:/home/core:/bin/bash\n' > /rootfs/etc/passwd; \
    printf 'root:x:0:\nnogroup:x:65534:\nnonroot:x:65532:\ncore:x:1000:\n' > /rootfs/etc/group; \
    for helper in /usr/lib/git-core/*; do \
        [ -f "$helper" ] && [ -x "$helper" ] || continue; \
        copy_with_libs "$helper"; \
    done; \
    cp -a --parents /usr/share/git-core/templates /rootfs; \
    ln -s bash /rootfs/bin/sh; \
    rm -rf /rootfs/usr/lib/git-core/*.test; \
    mkdir -p /rootfs/usr/share/licenses/debian; \
    dpkg-query -W | cut -f1 | while read -r package; do \
        name=$(printf '%s' "$package" | cut -d: -f1); \
        copyright="/usr/share/doc/$name/copyright"; \
        [ -f "$copyright" ] && cp "$copyright" "/rootfs/usr/share/licenses/debian/$name.copyright"; \
    done; \
    cp -a --parents /usr/share/doc/git/copyright /rootfs

# --- stage 3: distroless runtime ----------------------------------------------
FROM gcr.io/distroless/nodejs22-debian12 AS app

ARG OPENCHAMBER_VERSION

LABEL org.opencontainers.image.title="openchamber" \
      org.opencontainers.image.description="OpenChamber web interface (external OpenCode service)" \
      org.opencontainers.image.source="https://github.com/openchamber/openchamber" \
      org.opencontainers.image.version="${OPENCHAMBER_VERSION}"

COPY --from=tools /rootfs/ /

ENV HOME=/home/core \
    NODE_ENV=production \
    PATH=/nodejs/bin:/usr/local/bin:/usr/bin:/bin

WORKDIR /opt/openchamber

COPY --from=bundle /opt/openchamber/package.json ./package.json
COPY --from=bundle /opt/openchamber/node_modules/ ./node_modules/
COPY --from=bundle /opt/openchamber/bin/ ./bin/
COPY --from=bundle /opt/openchamber/server/ ./server/
COPY --from=bundle /opt/openchamber/dist/ ./dist/
COPY --chmod=0755 entrypoint.sh /entrypoint.sh
COPY openchamber-licence.txt /usr/share/licenses/openchamber/LICENSE

# uid/gid 1000 matches the host bind-mount owner; distroless has no user tooling.
USER 1000:1000
WORKDIR /home/core

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
