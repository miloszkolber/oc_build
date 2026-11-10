#!/usr/bin/env python3
"""Persistent nonroot Android workspace with an on-demand emulator supervisor."""
import json
import os
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

SOCKET = '/tmp/android-runtime.sock'
LOG = Path('/state/logs/vnc.log')
INTERVAL = int(os.environ.get('ANDROID_EMULATOR_IDLE_SECONDS', '3600'))


def viewer_connected():
    # An HTTP request is not a viewer. websockify establishes a connection to x11vnc.
    for path in ('/proc/net/tcp', '/proc/net/tcp6'):
        for line in Path(path).read_text().splitlines()[1:]:
            fields = line.split()
            if fields[1].split(':')[1] == '170C' and fields[3] == '01':
                return True
    return False


def request(command):
    with socket.socket(socket.AF_UNIX) as client:
        client.settimeout(60)
        client.connect(SOCKET)
        client.sendall((command + '\n').encode())
        data = b''
        while not data.endswith(b'\n'):
            part = client.recv(4096)
            if not part:
                break
            data += part
    result = json.loads(data)
    print(result['message'])
    return 0 if result['ok'] else 1


def main():
    if INTERVAL < 1:
        raise ValueError('ANDROID_EMULATOR_IDLE_SECONDS must be positive')
    # `docker exec` inherits the image's build-tool HOME, not the separate
    # emulator HOME below. ADB needs its parent to exist on fresh state.
    for name in ('HOME', 'ANDROID_USER_HOME'):
        Path(os.environ[name]).mkdir(parents=True, exist_ok=True)
    try:
        os.unlink(SOCKET)
    except FileNotFoundError:
        pass
    server = socket.socket(socket.AF_UNIX)
    server.bind(SOCKET)
    os.chmod(SOCKET, 0o600)
    server.listen(8)
    server.settimeout(1)
    child = None
    since = None
    log_mtime = None
    stopping = False

    def shutdown(_signal, _frame):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    def stop():
        nonlocal child, since, log_mtime
        if child is None:
            return
        if child.poll() is None:
            child.terminate()  # start-emulator.sh syncs and requests guest exit.
            try:
                child.wait(timeout=35)
            except subprocess.TimeoutExpired:
                print('Graceful emulator stop timed out; terminating process group', flush=True)
        # Clean any surviving descendants, including on unexpected parent exit.
        try:
            os.killpg(child.pid, signal.SIGTERM)
            time.sleep(0.2)
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        child.wait()
        child = None
        since = log_mtime = None

    try:
        while not stopping:
            if child is not None and child.poll() is not None:
                print('Emulator runtime exited unexpectedly; cleaning up', flush=True)
                stop()
            if child is not None:
                try:
                    mtime = LOG.stat().st_mtime_ns
                    connected = viewer_connected()
                    now = time.monotonic()
                    if connected or log_mtime != mtime:
                        since = now
                    log_mtime = mtime
                    if since is not None and now - since >= INTERVAL:
                        # Recheck immediately before stop; errors fail closed.
                        if not viewer_connected() and LOG.stat().st_mtime_ns == log_mtime:
                            print('Stopping viewer-idle emulator', flush=True)
                            stop()
                except (OSError, ValueError, IndexError) as error:
                    since = time.monotonic()
                    print(f'Viewer inspection failed; keeping emulator: {error}', flush=True)
            try:
                conn, _ = server.accept()
            except socket.timeout:
                continue
            with conn:
                conn.settimeout(2)
                try:
                    command = conn.recv(100).decode().strip()
                    if command == 'start':
                        if child is None:
                            env = os.environ.copy()
                            env.update(HOME='/emulator/home', ANDROID_USER_HOME='/emulator/android',
                                       ANDROID_AVD_HOME='/state/avd', JAVA_TOOL_OPTIONS='-Duser.home=/emulator/home')
                            child = subprocess.Popen(['start-emulator.sh'], env=env, start_new_session=True)
                            since = time.monotonic()
                            log_mtime = None
                            message = 'Emulator start requested.'
                        else:
                            message = 'Emulator already running or starting.'
                        result = {'ok': True, 'message': message}
                    elif command == 'stop':
                        stop()
                        result = {'ok': True, 'message': 'Emulator stopped.'}
                    elif command == 'status':
                        result = {'ok': True, 'message': 'running' if child is not None else 'stopped'}
                    else:
                        result = {'ok': False, 'message': 'Use start, stop or status.'}
                    conn.sendall((json.dumps(result) + '\n').encode())
                except (OSError, UnicodeError) as error:
                    print(f'Control error: {error}', flush=True)
    finally:
        stop()
        server.close()
        try:
            os.unlink(SOCKET)
        except FileNotFoundError:
            pass


if __name__ == '__main__':
    if len(sys.argv) == 1:
        main()
    elif len(sys.argv) == 2 and sys.argv[1] in ('start', 'stop', 'status'):
        sys.exit(request(sys.argv[1]))
    else:
        sys.exit('Usage: android-runtime.py [start|stop|status]')
