"""Serve only public deploy files, never ignored source, passwords or Git metadata."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import os
ROOT = Path(__file__).resolve().parent.parent
PUBLIC = {"index.html", "gate.css", "gate.js", "site.enc.json", "assets/crest.svg"}
class PublicHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        name = unquote(urlsplit(self.path).path).lstrip("/") or "index.html"
        if name not in PUBLIC:
            self.send_error(404)
            return
        super().do_GET()
    def do_HEAD(self):
        name = unquote(urlsplit(self.path).path).lstrip("/") or "index.html"
        if name not in PUBLIC:
            self.send_error(404)
            return
        super().do_HEAD()
if __name__ == "__main__":
    os.chdir(ROOT)
    print("CSFC public preview: http://127.0.0.1:8000", flush=True)
    server = ThreadingHTTPServer(("127.0.0.1", 8000), PublicHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
