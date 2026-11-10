#!/usr/bin/env bash
set -euo pipefail
boot=$(timeout 8s adb -s emulator-5554 shell getprop sys.boot_completed | tr -d '\r')
[[ "$boot" == 1 ]]
case "${FYLAX_AVD_PROFILE:-api35-standard}" in
    api29-small) expected_api=29 width=480 height=960 density=240 ;;
    api35-standard) expected_api=35 width=720 height=1280 density=280 ;;
    api35-tall) expected_api=35 width=900 height=2000 density=360 ;;
    *) echo "Unknown FYLAX_AVD_PROFILE '${FYLAX_AVD_PROFILE:-}'" >&2; exit 1 ;;
esac
api=$(timeout 8s adb -s emulator-5554 shell getprop ro.build.version.sdk | tr -d '\r')
[[ "$api" == "$expected_api" ]] || { echo "Expected API $expected_api, booted API $api." >&2; exit 1; }
size=$(timeout 8s adb -s emulator-5554 shell wm size | tr -d '\r')
grep -Fq "Physical size: ${width}x${height}" <<<"$size" || { echo "Unexpected physical size for profile ${FYLAX_AVD_PROFILE:-api35-standard}: $size" >&2; exit 1; }
density_output=$(timeout 8s adb -s emulator-5554 shell wm density | tr -d '\r')
grep -Fq "Physical density: $density" <<<"$density_output" || { echo "Unexpected physical density for profile ${FYLAX_AVD_PROFILE:-api35-standard}: $density_output" >&2; exit 1; }
curl -fsS --max-time 3 http://127.0.0.1:6080/vnc.html >/dev/null
