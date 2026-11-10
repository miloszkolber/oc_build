# Design

Retain one persistent non-root container with build tools and an on-demand emulator. Package the existing lifecycle controller and its viewer scripts in the image instead of mounting deployment-owned source. Control commands remain available through container exec. AVD names, state paths and profile semantics remain compatible with the existing deployment.

The runtime needs a JDK, Android SDK binaries, emulator dynamic libraries, X server, window manager, VNC bridge and Python runtime for the controller and websockify. Removing them merely to call the image distroless would break supported development or viewing. Use the existing no-recommends package selection and clean package metadata. A separate SDK build stage removes the build-only unzip utility from the final runtime. Record the measured result rather than claiming an untested minimal closure.

Google's SDK terms section 3.4 restrict redistribution subject to third-party license exceptions. The existing SDK image is locally built and not distributed. Preserve that boundary; a published SDK-bearing image requires separate rights review. Build-time SDK agreement acceptance remains explicit and is not a blanket acceptance of extra licenses.
