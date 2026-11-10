#!/usr/bin/env bash
# Checks that emulator windows stay inside the Xvfb desktop and that the
# extended-controls panel can be closed, instead of trusting browser scaling.
set -euo pipefail
: "${DISPLAY:=:99}"

read -r desktop_w desktop_h < <(xdotool getdisplaygeometry)
[[ -n "${desktop_w:-}" && -n "${desktop_h:-}" ]] || { echo 'Desktop geometry unavailable.' >&2; exit 1; }

fail() { echo "$*" >&2; exit 1; }

check_window() {
    local id=$1 name=$2
    eval "$(xdotool getwindowgeometry --shell "$id")"
    # The window manager draws the title bar above the client area, so a title-bar
    # height of clear space at the top keeps it reachable.
    (( Y >= 28 )) || fail "$name title bar is above the desktop: Y=${Y}"
    (( X + WIDTH <= desktop_w )) || fail "$name exceeds desktop width ${desktop_w}: X=${X} W=${WIDTH}"
    (( Y + HEIGHT <= desktop_h )) || fail "$name exceeds desktop height ${desktop_h}: Y=${Y} H=${HEIGHT}"
    printf 'PASS: %s fits the %sx%s desktop at %s,%s size %sx%s.\n' \
        "$name" "$desktop_w" "$desktop_h" "$X" "$Y" "$WIDTH" "$HEIGHT"
}

mapfile -t emulators < <(xdotool search --onlyvisible --name 'Android Emulator' || true)
((${#emulators[@]})) || fail 'No visible emulator window; start the emulator first.'
for id in "${emulators[@]}"; do check_window "$id" 'Emulator window'; done

mapfile -t controls < <(xdotool search --onlyvisible --name 'Extended Controls' || true)
if ((${#controls[@]} == 0)); then
    echo 'INCOMPLETE: Extended Controls is not open, so its layout was not checked.'
    exit 1
fi
for id in "${controls[@]}"; do check_window "$id" 'Extended Controls window'; done

for id in "${controls[@]}"; do xdotool windowclose "$id"; done
sleep 1
if xdotool search --onlyvisible --name 'Extended Controls' >/dev/null 2>&1; then
    fail 'Extended Controls did not close when requested.'
fi
printf '%s\n' 'PASS: Extended Controls closed on request; the emulator window remains available.'
