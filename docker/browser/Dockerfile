# syntax=mirror.gcr.io/docker/dockerfile:1
FROM mirror.gcr.io/oven/bun:1.4.2 AS bun-runtime
FROM mirror.gcr.io/library/debian:bookworm-slim AS build
ARG OPENCHAMBER_SOURCE_REVISION=unknown
RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates chromium fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
COPY --from=bun-runtime /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /src/browser
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY LICENSE NOTICE THIRD_PARTY_LICENSES ./
RUN --network=none bun run build \
    && printf '{"chromePath":"/usr/lib/chromium/chromium"}\n' > dist/config.json
WORKDIR /
RUN set -eu; \
    mkdir -p /browser-rootfs; \
    rootfs=/browser-rootfs; \
    copy_with_libs() { \
        cp -a --parents "$1" "$rootfs"; \
        ldd "$1" | grep -oE '/[^ ]+\.so[^ ]*' | sort -u | while read -r lib; do \
            [ -e "$lib" ] || continue; \
            mkdir -p "$rootfs$(dirname "$lib")"; \
            cp -aL "$lib" "$rootfs$lib"; \
        done; \
    }; \
    copy_with_libs /usr/lib/chromium/chromium; \
    copy_with_libs /usr/lib/chromium/chrome_crashpad_handler; \
    for browser_lib in /usr/lib/chromium/*.so; do \
        [ -f "$browser_lib" ] && copy_with_libs "$browser_lib"; \
    done; \
    cp -a /usr/lib/chromium /browser-rootfs/usr/lib/; \
    for assets in /etc/fonts /usr/share/fonts /usr/share/fontconfig; do \
        [ -e "$assets" ] && cp -a --parents "$assets" /browser-rootfs; \
    done; \
    softokn_module="$(dpkg-query -L libnss3 | grep -m1 '/libsoftokn3\.so$' || true)"; \
    test -n "$softokn_module"; \
    dpkg-query -L libnss3 | grep -E '/(libnss|libsoftokn|libfreebl)[^/]*\.(so|chk)$' | while IFS= read -r nss_file; do \
        case "$nss_file" in \
            *.so) copy_with_libs "$nss_file" ;; \
            *.chk) cp -a --parents "$nss_file" /browser-rootfs ;; \
        esac; \
    done; \
    mkdir -p /browser-rootfs/usr/share/licenses/debian; \
    dpkg-query -W | cut -f1 | while read -r package; do \
        name=$(printf '%s' "$package" | cut -d: -f1); \
        copyright="/usr/share/doc/$name/copyright"; \
        [ -f "$copyright" ] && cp "$copyright" "/browser-rootfs/usr/share/licenses/debian/$name.copyright"; \
    done; \
    test -f /browser-rootfs/usr/share/licenses/debian/chromium.copyright; \
    test -f /browser-rootfs/usr/share/licenses/debian/chromium-common.copyright; \
    test -x /browser-rootfs/usr/lib/chromium/chromium; \
    mkdir -p /browser-rootfs/usr/share/openchamber; \
    chromium_version="$(/usr/lib/chromium/chromium --version | sed 's/[[:space:]]*$//')"; \
    chromium_package_version="$(dpkg-query -W chromium | cut -f2)"; \
    chromium_common_version="$(dpkg-query -W chromium-common | cut -f2)"; \
    fonts_version="$(dpkg-query -W fonts-liberation | cut -f2)"; \
    certificates_version="$(dpkg-query -W ca-certificates | cut -f2)"; \
    printf '{"sourceRevision":"%s","chromiumVersion":"%s","nssSoftoknModule":"%s","packages":{"chromium":"%s","chromium-common":"%s","fonts-liberation":"%s","ca-certificates":"%s"}}\n' \
        "$OPENCHAMBER_SOURCE_REVISION" "$chromium_version" "$softokn_module" "$chromium_package_version" \
        "$chromium_common_version" "$fonts_version" "$certificates_version" \
        > /browser-rootfs/usr/share/openchamber/browser-build.json; \
    mkdir -p /browser-rootfs/usr/bin; \
    ln -s /usr/lib/chromium/chromium /browser-rootfs/usr/bin/chromium
FROM gcr.io/distroless/nodejs22-debian12 AS browser
LABEL org.opencontainers.image.title="openchamber-browser" \
      org.opencontainers.image.description="Standalone browser MCP and Chromium"
COPY --from=build /browser-rootfs/ /
COPY --from=build /src/browser/dist/ /opt/browser/
COPY --from=build /src/browser/dist/LICENSE /src/browser/dist/NOTICE /src/browser/dist/THIRD_PARTY_LICENSES /usr/share/licenses/browser/
ENV HOME=/tmp NODE_ENV=production PATH=/nodejs/bin:/usr/bin
USER 1000:1000
WORKDIR /tmp
ENTRYPOINT ["/nodejs/bin/node", "/opt/browser/main.js"]
