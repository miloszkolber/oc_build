#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$HOME" "$ANDROID_USER_HOME"

java -version
sdkmanager --version | grep -x '19.0'
grep -Fx 'Pkg.Revision=37.0.1' "$ANDROID_HOME/platform-tools/source.properties"
grep -Fx 'Pkg.Revision=37.2.13' "$ANDROID_HOME/emulator/source.properties"
grep -Fx 'Pkg.Revision=36.0.0' "$ANDROID_HOME/build-tools/36.0.0/source.properties"
grep -Fx 'Pkg.Revision=35.0.0' "$ANDROID_HOME/build-tools/35.0.0/source.properties"
grep -Fx 'Pkg.Revision=2' "$ANDROID_HOME/platforms/android-36/source.properties"
grep -Fx 'Pkg.Revision=2' "$ANDROID_HOME/system-images/android-35/default/x86_64/source.properties"
grep -Fx 'Pkg.Revision=8' "$ANDROID_HOME/system-images/android-29/default/x86_64/source.properties"
command -v openbox
command -v xdotool
adb version
emulator -no-metrics -version
"$ANDROID_HOME/build-tools/36.0.0/aapt2" version
printf '%s\n' 'PASS: selected stable Android development tools present.'
