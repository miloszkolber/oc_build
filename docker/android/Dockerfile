FROM eclipse-temurin:21-jdk-jammy@sha256:4b1a74fbffbe6b4e7b6f0171a472478282fb463790a51edf10e465d578f22b69 AS sdk

ARG ANDROID_SDK_LICENSE_ACCEPTED=0
RUN test "$ANDROID_SDK_LICENSE_ACCEPTED" = 1 || \
    (echo 'Explicit acceptance of https://developer.android.com/studio/terms is required.' >&2; exit 1)

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl unzip \
    && rm -rf /var/lib/apt/lists/*

ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    ANDROID_AVD_HOME=/state/avd \
    ANDROID_USER_HOME=/state/android \
    HOME=/state/home \
    GRADLE_USER_HOME=/state/gradle \
    DISPLAY=:99 \
    QT_X11_NO_MITSHM=1 \
    ANDROID_EMULATOR_USE_SYSTEM_LIBS=1
ENV PATH="/opt/android-sdk/cmdline-tools/19.0/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/emulator:${PATH}"

RUN mkdir -p "$ANDROID_HOME/cmdline-tools" /tmp/android-tools /state \
    && curl -fL --retry 3 -o /tmp/tools.zip \
       https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip \
    && echo '7ec965280a073311c339e571cd5de778b9975026cfcbe79f2b1cdcb1e15317ee  /tmp/tools.zip' | sha256sum -c - \
    && unzip -q /tmp/tools.zip -d /tmp/android-tools \
    && mv /tmp/android-tools/cmdline-tools "$ANDROID_HOME/cmdline-tools/19.0" \
    && rm -rf /tmp/tools.zip /tmp/android-tools

# Only stable packages required by this environment, not sdkmanager --licenses.
# One approval line accepts the required SDK agreement, not arbitrary extra terms.
RUN mkdir -p "$ANDROID_USER_HOME" "$HOME" \
    && printf 'y\n' | sdkmanager --sdk_root="$ANDROID_HOME" --channel=0 \
       'platform-tools' 'emulator' 'platforms;android-36' 'build-tools;36.0.0' 'build-tools;35.0.0' \
       'system-images;android-29;default;x86_64' 'system-images;android-35;default;x86_64' \
    && rm -rf /state/*

FROM eclipse-temurin:21-jdk-jammy@sha256:4b1a74fbffbe6b4e7b6f0171a472478282fb463790a51edf10e465d578f22b69

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl python3 xvfb openbox x11vnc novnc websockify xdotool \
    libx11-6 libxcb1 libxkbcommon0 libxkbcommon-x11-0 libxcb-cursor0 \
    libxcb-icccm4 libxcb-image0 libxcb-keysyms1 libxcb-randr0 \
    libxcb-render-util0 libxcb-shape0 libxcb-xfixes0 libnss3 libasound2 \
    libpulse0 libgl1 libglib2.0-0 libdbus-1-3 fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

ENV ANDROID_HOME=/opt/android-sdk \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    ANDROID_AVD_HOME=/state/avd \
    ANDROID_USER_HOME=/state/android \
    HOME=/state/home \
    GRADLE_USER_HOME=/state/gradle \
    DISPLAY=:99 \
    QT_X11_NO_MITSHM=1 \
    ANDROID_EMULATOR_USE_SYSTEM_LIBS=1
ENV PATH="/opt/android-sdk/cmdline-tools/19.0/bin:/opt/android-sdk/platform-tools:/opt/android-sdk/emulator:${PATH}"

COPY --from=sdk /opt/android-sdk /opt/android-sdk
COPY check-tools.sh check-sdk-build.sh start-emulator.sh check-emulator.sh check-viewer-layout.sh android-runtime.py check-viewer.py /usr/local/bin/
RUN chmod 755 /usr/local/bin/check-tools.sh /usr/local/bin/check-sdk-build.sh /usr/local/bin/start-emulator.sh /usr/local/bin/check-emulator.sh /usr/local/bin/check-viewer-layout.sh /usr/local/bin/check-viewer.py \
    && useradd --uid 1000 --create-home --home-dir /home/android android \
    && mkdir -p /state /emulator \
    && chown android:android /state /emulator \
    && check-tools.sh \
    && rm -rf /state/*

USER 1000:1000
ENV JAVA_TOOL_OPTIONS="-Duser.home=/state/home"
WORKDIR /workspace
CMD ["python3", "/usr/local/bin/android-runtime.py"]
