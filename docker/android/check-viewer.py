#!/usr/bin/env python3
"""Check the local noVNC WebSocket and VNC pointer path without a browser."""
import base64
import os
import socket
import struct
import sys
import time


def receive_exact(sock, count):
    data = b''
    while len(data) < count:
        part = sock.recv(count - len(data))
        if not part:
            raise RuntimeError('viewer closed the connection')
        data += part
    return data


class WebSocket:
    def __init__(self, sock):
        self.sock = sock
        self.pending = b''

    def send(self, payload, opcode=2):
        size = len(payload)
        if size >= 126:
            raise ValueError('test messages must be shorter than 126 bytes')
        mask = os.urandom(4)
        data = bytes(byte ^ mask[i % 4] for i, byte in enumerate(payload))
        self.sock.sendall(bytes([0x80 | opcode, 0x80 | size]) + mask + data)

    def read(self, count):
        while len(self.pending) < count:
            header = receive_exact(self.sock, 2)
            opcode = header[0] & 15
            size = header[1] & 127
            if header[1] & 128:
                raise RuntimeError('unexpected masked server frame')
            if size == 126:
                size = struct.unpack('!H', receive_exact(self.sock, 2))[0]
            elif size == 127:
                size = struct.unpack('!Q', receive_exact(self.sock, 8))[0]
            if size > 1024 * 1024:
                raise RuntimeError('unexpectedly large viewer frame')
            data = receive_exact(self.sock, size)
            if opcode in (0, 2):
                self.pending += data
            elif opcode == 9:
                self.send(data, opcode=10)
            else:
                raise RuntimeError(f'unexpected viewer frame {opcode}')
        result, self.pending = self.pending[:count], self.pending[count:]
        return result


def main():
    hold = int(sys.argv[1]) if len(sys.argv) == 2 else 0
    if hold < 0:
        raise ValueError('hold must be nonnegative')
    with socket.create_connection(('127.0.0.1', 6080), timeout=10) as sock:
        key = base64.b64encode(os.urandom(16)).decode()
        request = ('GET /websockify HTTP/1.1\r\nHost: localhost:6080\r\n'
                   'Upgrade: websocket\r\nConnection: Upgrade\r\n'
                   f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n'
                   'Sec-WebSocket-Protocol: binary\r\n\r\n')
        sock.sendall(request.encode())
        response = b''
        while not response.endswith(b'\r\n\r\n') and len(response) < 8192:
            response += receive_exact(sock, 1)
        if not response.startswith(b'HTTP/1.1 101 '):
            raise RuntimeError(f'websocket upgrade failed: {response[:200]!r}')
        ws = WebSocket(sock)
        version = ws.read(12)
        if version != b'RFB 003.008\n':
            raise RuntimeError(f'unexpected RFB version: {version!r}')
        ws.send(version)
        count = ws.read(1)[0]
        if 1 not in ws.read(count):
            raise RuntimeError('server did not offer unauthenticated VNC')
        ws.send(b'\x01')
        if ws.read(4) != b'\0\0\0\0':
            raise RuntimeError('VNC security handshake failed')
        ws.send(b'\x01')
        init = ws.read(24)
        width, height, name_length = struct.unpack('!HH16xI', init)
        bits_per_pixel = init[4]
        if width < 200 or height < 200 or name_length > 4096 or bits_per_pixel not in (8, 16, 32):
            raise RuntimeError('invalid VNC server dimensions or name')
        ws.read(name_length)
        ws.send(struct.pack('!BBHHHH', 3, 0, 0, 0, 1, 1))
        update = ws.read(4)
        count = struct.unpack('!H', update[2:])[0]
        if update[:2] != b'\0\0' or not 1 <= count <= 64:
            raise RuntimeError(f'unexpected framebuffer update: {update!r}')
        for _ in range(count):
            rectangle = ws.read(12)
            x, y, rect_width, rect_height, encoding = struct.unpack('!HHHHi', rectangle)
            if encoding != 0 or rect_width * rect_height > width * height:
                raise RuntimeError(f'unexpected framebuffer rectangle: {(x, y, rect_width, rect_height, encoding)}')
            ws.read(rect_width * rect_height * bits_per_pixel // 8)
        ws.send(struct.pack('!BBHH', 5, 0, 123, 145))
        print(f'VNC framebuffer received and pointer sent; desktop {width}x{height}', flush=True)
        time.sleep(hold)
        ws.send(b'', opcode=8)


if __name__ == '__main__':
    main()
