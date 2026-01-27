#!/usr/bin/env python3
"""
Simple HTTPS server for testing on mobile devices.
Microphone access requires HTTPS on most mobile browsers.

Usage:
    # First, generate a self-signed certificate:
    openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj '/CN=localhost'
    
    # Then run this server:
    python3 ssl_server.py
    
    # Access from phone at https://YOUR_IP:8443
    # (You'll need to accept the security warning for self-signed cert)
"""

import http.server
import ssl
import os
import socket

PORT = 8443

def get_local_ip():
    """Get the local IP address for display."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"

def main():
    # Check for certificate files
    if not os.path.exists('cert.pem') or not os.path.exists('key.pem'):
        print("Certificate files not found!")
        print("\nGenerate them with:")
        print("  openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj '/CN=localhost'")
        print("\nThen run this script again.")
        return
    
    # Create server
    handler = http.server.SimpleHTTPRequestHandler
    httpd = http.server.HTTPServer(('0.0.0.0', PORT), handler)
    
    # Wrap with SSL
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain('cert.pem', 'key.pem')
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    local_ip = get_local_ip()
    
    print(f"\n🌲 Mandarin Practice Server")
    print(f"=" * 40)
    print(f"\nServing at:")
    print(f"  Local:   https://localhost:{PORT}")
    print(f"  Network: https://{local_ip}:{PORT}")
    print(f"\n⚠️  Your phone will show a security warning.")
    print(f"   This is normal for self-signed certificates.")
    print(f"   Tap 'Advanced' → 'Proceed' to continue.")
    print(f"\nPress Ctrl+C to stop.\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == '__main__':
    main()
