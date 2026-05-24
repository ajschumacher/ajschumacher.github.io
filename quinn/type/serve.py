#!/usr/bin/env python3
"""Dev server with Cache-Control: no-store so JS modules are never cached."""
import http.server
import socketserver

PORT = 8765

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # suppress per-request noise

with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
    print(f'Serving at http://localhost:{PORT}  (no-cache)')
    httpd.serve_forever()
