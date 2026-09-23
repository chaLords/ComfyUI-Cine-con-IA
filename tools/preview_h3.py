"""Local UI harness: real extension widgets + real read-only planner, no generation."""
import json
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import nodes

APP = '''export const app = {extensions: [], graph: {setDirtyCanvas(){window.dispatchEvent(new Event("redraw"));}},
registerExtension(extension){this.extensions.push(extension);}};'''
API = '''export const api = {addEventListener(){}, fetchApi: (url, options) => fetch(url, options)};'''


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send(self, value, content_type="application/json"):
        data = value.encode("utf-8") if isinstance(value, str) else json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", content_type + "; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/scripts/app.js":
            return self.send(APP, "text/javascript")
        if path == "/scripts/api.js":
            return self.send(API, "text/javascript")
        if path == "/schema":
            return self.send({name: nodes.NODE_CLASS_MAPPINGS[name].INPUT_TYPES() for name in
                ["CineSimplePromptH3", "CineCameraDirectorH3", "CineH3Optimizer"]})
        if path.startswith("/extensions/cineconia/"):
            self.path = "/web/" + path.rsplit("/", 1)[1]
        return super().do_GET()

    def do_POST(self):
        if self.path != "/cineconia/h3/preview":
            return self.send_error(404)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 65536:
                return self.send_error(413)
            body = json.loads(self.rfile.read(length))
            return self.send(nodes.preview_h3(body))
        except (ValueError, TypeError, KeyError) as exc:
            return self.send_error(400, str(exc))

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print("Vista de prueba: http://127.0.0.1:8199/docs/h3-interface-preview.html", flush=True)
    ThreadingHTTPServer(("127.0.0.1", 8199), Handler).serve_forever()
