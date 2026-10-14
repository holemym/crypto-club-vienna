"""Local static server with gzip, like Vercel: python tools/serve.py [port]
Serves site/ and compresses text responses, so Lighthouse numbers match production more closely."""
import gzip, http.server, io, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / "site"
TEXT = (".html", ".css", ".js", ".json", ".svg", ".txt")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def send_head(self):
        path = pathlib.Path(self.translate_path(self.path))
        if path.is_dir():
            path = path / "index.html"
        if path.suffix in TEXT and path.exists() and "gzip" in self.headers.get("Accept-Encoding", ""):
            body = gzip.compress(path.read_bytes(), 6)
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(str(path)))
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            return io.BytesIO(body)
        return super().send_head()

    def log_message(self, *a):
        pass

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8418
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
