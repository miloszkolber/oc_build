#!/usr/bin/env bash
set -euo pipefail

if [[ ! -r /dev/kvm || ! -w /dev/kvm ]]; then
    echo 'KVM is unavailable. Pass /dev/kvm and its group to this container.' >&2
    exit 1
fi
mkdir -p "$HOME" "$ANDROID_USER_HOME" "$ANDROID_AVD_HOME" /state/logs
printf 'count=0\n' > "$ANDROID_USER_HOME/analytics.settings"
emulator -accel-check

case "${FYLAX_AVD_PROFILE:-api35-standard}" in
    api29-small)
        avd_name=fylax-api29-small
        image='system-images;android-29;default;x86_64'
        width=480 height=960 density=240
        ;;
    api35-standard)
        # Preserve the original default AVD and its persistent developer state.
        avd_name=fylax-api35
        image='system-images;android-35;default;x86_64'
        width=720 height=1280 density=280
        ;;
    api35-tall)
        avd_name=fylax-api35-tall
        image='system-images;android-35;default;x86_64'
        width=900 height=2000 density=360
        ;;
    *)
        echo "Unknown FYLAX_AVD_PROFILE '${FYLAX_AVD_PROFILE:-}'. Choose api29-small, api35-standard or api35-tall." >&2
        exit 2
        ;;
esac

if [[ ! -f "$ANDROID_AVD_HOME/$avd_name.ini" ]]; then
    printf 'no\n' | avdmanager create avd --force --name "$avd_name" \
        --package "$image" --device pixel
fi

avd_config="$ANDROID_AVD_HOME/$avd_name.avd/config.ini"
sed -i -E \
    -e "s/^hw\\.lcd\\.width[[:space:]]*=.*/hw.lcd.width = $width/" \
    -e "s/^hw\\.lcd\\.height[[:space:]]*=.*/hw.lcd.height = $height/" \
    -e "s/^hw\\.lcd\\.density[[:space:]]*=.*/hw.lcd.density = $density/" \
    "$avd_config"
printf 'Starting AVD profile %s (%s, %sx%s at %s dpi).\n' \
    "${FYLAX_AVD_PROFILE:-api35-standard}" "$image" "$width" "$height" "$density"

pids=()
cleanup() {
    trap - EXIT INT TERM
    # Flush the guest filesystem before stopping QEMU. Killing the display and
    # emulator together can discard very recent APK/data writes on a cold boot.
    timeout 10s adb -s emulator-5554 shell sync >> /state/logs/shutdown.log 2>&1 || true
    timeout 10s adb -s emulator-5554 emu kill >> /state/logs/shutdown.log 2>&1 || true
    if ((${#pids[@]})); then
        kill "${pids[@]}" 2>/dev/null || true
        wait "${pids[@]}" 2>/dev/null || true
    fi
}
trap cleanup EXIT
trap 'exit 0' INT TERM

# Size the desktop to the emulated screen plus the separate extended-controls window
# and its title bar, so noVNC's fit-to-browser scaling keeps the phone as large as possible.
Xvfb "$DISPLAY" -screen 0 "$((width + 620))x$((height + 140))x24" -nolisten tcp \
    > /state/logs/display.log 2>&1 &
pids+=("$!")
for _ in {1..50}; do
    [[ -S /tmp/.X11-unix/X99 ]] && break
    kill -0 "${pids[0]}" || exit 1
    sleep 0.1
done
[[ -S /tmp/.X11-unix/X99 ]] || exit 1

openbox --sm-disable > /state/logs/window-manager.log 2>&1 &
pids+=("$!")
sleep 0.2
kill -0 "${pids[1]}" || { echo 'Openbox window manager failed to start.' >&2; exit 1; }

x11vnc -display "$DISPLAY" -localhost -nopw -forever -shared -rfbport 5900 \
    > /state/logs/vnc.log 2>&1 &
pids+=("$!")
websockify --web=/usr/share/novnc 0.0.0.0:6080 127.0.0.1:5900 \
    > /state/logs/viewer.log 2>&1 &
pids+=("$!")

emulator -avd "$avd_name" -port 5554 -gpu software -fixed-scale -memory 3072 -cores 4 \
    -no-audio -no-boot-anim -no-snapshot -no-metrics -no-skin \
    > /state/logs/emulator.log 2>&1 &
pids+=("$!")

printf '%s\n' 'Viewer started. Android boot readiness is a separate health check.'
set +e
wait -n "${pids[@]}"
status=$?
set -e
echo "An emulator/viewer process exited (status $status). Stopping the runtime." >&2
exit 1
