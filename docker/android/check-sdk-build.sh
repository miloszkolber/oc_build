#!/usr/bin/env bash
# Toolchain diagnostic only, not the Fylax app or its chosen UI architecture.
set -euo pipefail
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work"/{res/values,res/values-pl,generated,classes,dex}
cat > "$work/AndroidManifest.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="dev.fylax.environment">
    <application android:label="@string/app_name" android:theme="@android:style/Theme.Material.Light.NoActionBar" android:allowBackup="false">
        <activity android:name=".EnvironmentCheck" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF
cat > "$work/res/values/strings.xml" <<'EOF'
<resources>
    <string name="app_name">Fylax environment check</string>
    <string name="message">Android environment is working.\n\nThis is a toolchain diagnostic, not the Fylax app.\n\nBuild, installation and browser input can be tested here. No protection is active.\n\nTap to test input.</string>
    <string name="input_ok">Browser input received.\n\nDevelopment diagnostic only. No protection is active.</string>
</resources>
EOF
cat > "$work/res/values-pl/strings.xml" <<'EOF'
<resources>
    <string name="app_name">Test środowiska Fylax</string>
    <string name="message">Środowisko Android działa.\n\nTo test narzędzi, nie aplikacja Fylax.\n\nMożna sprawdzić kompilację, instalację i obsługę przez przeglądarkę. Ochrona nie jest aktywna.\n\nDotknij, aby sprawdzić obsługę.</string>
    <string name="input_ok">Odebrano dotknięcie z przeglądarki.\n\nTo tylko test środowiska. Ochrona nie jest aktywna.</string>
</resources>
EOF
cat > "$work/EnvironmentCheck.java" <<'EOF'
package dev.fylax.environment;
import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;
public final class EnvironmentCheck extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        TextView text = new TextView(this);
        text.setText(R.string.message);
        text.setTextSize(22);
        text.setPadding(32, 80, 32, 32);
        text.setOnClickListener(v -> text.setText(R.string.input_ok));
        setContentView(text);
    }
}
EOF
tools="$ANDROID_HOME/build-tools/36.0.0"
platform="$ANDROID_HOME/platforms/android-36/android.jar"
"$tools/aapt2" compile --dir "$work/res" -o "$work/resources.zip"
"$tools/aapt2" link -o "$work/unsigned.apk" -I "$platform" \
    --manifest "$work/AndroidManifest.xml" --min-sdk-version 28 --target-sdk-version 36 \
    --java "$work/generated" "$work/resources.zip"
javac --release 8 -cp "$platform" -d "$work/classes" \
    "$work/EnvironmentCheck.java" "$work/generated/dev/fylax/environment/R.java"
jar --create --file "$work/classes.jar" -C "$work/classes" .
"$tools/d8" --min-api 28 --lib "$platform" --output "$work/dex" "$work/classes.jar"
python3 -c 'import sys, zipfile; z=zipfile.ZipFile(sys.argv[1], "a"); z.write(sys.argv[2], "classes.dex"); z.close()' \
    "$work/unsigned.apk" "$work/dex/classes.dex"
"$tools/zipalign" -f -p 4 "$work/unsigned.apk" "$work/aligned.apk"
# Disposable public-test signing material. Never used for product releases.
keytool -genkeypair -noprompt -keystore "$work/diagnostic.jks" -alias diagnostic \
    -storepass android -keypass android -dname 'CN=Local SDK diagnostic' \
    -keyalg RSA -keysize 2048 -validity 2 >/dev/null 2>&1
mkdir -p /state/diagnostics
"$tools/apksigner" sign --ks "$work/diagnostic.jks" --ks-pass pass:android \
    --out /state/diagnostics/environment-check.apk "$work/aligned.apk"
"$tools/apksigner" verify --verbose /state/diagnostics/environment-check.apk
echo 'PASS: SDK compiled and signed EN/PL diagnostic APK at /state/diagnostics/environment-check.apk (not the product app).'
