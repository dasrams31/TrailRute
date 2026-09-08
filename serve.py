"""
Launcher Server for TrailRute 3D Web Game (Multi-threaded & Robust)
"""

import http.server
import os
import sys

PORT = 8888

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)
        
    def end_headers(self):
        # Enable CORS and caching headers for smooth 3D asset loading
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run():
    global PORT
    server_address = ('0.0.0.0', PORT)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    
    try:
        httpd = http.server.ThreadingHTTPServer(server_address, CustomHandler)
    except OSError:
        for p in range(8889, 8900):
            try:
                PORT = p
                httpd = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), CustomHandler)
                break
            except OSError:
                continue
        else:
            print("Tidak ada port yang tersedia.")
            return

    print("=" * 65)
    print(f"  ⛰️  TRAILRUTE 3D - Multi-Threaded Server Aktif!")
    print(f"  🌐  Lokal: http://localhost:{PORT}")
    print(f"  🌐  Jaringan: http://0.0.0.0:{PORT}")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")

if __name__ == "__main__":
    run()
