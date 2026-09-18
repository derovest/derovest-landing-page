#!/usr/bin/env python3
"""Local preview server that behaves like this site's Vercel deployment.

`python3 -m http.server` is not a useful preview for this repo: every link on
the site is extensionless (/about, /services/seo) because vercel.json sets
cleanUrls, so the plain server 404s on all of them and turns /services into a
directory listing. This reads vercel.json and applies the same rules:

  · cleanUrls      /about            -> about.html
  · trailingSlash  /about/           -> 301 /about
  · redirects      /staffing         -> 301 /services/technology-staffing
  · 404            anything missing  -> 404.html, with a real 404 status

    python3 tools/serve.py [port]        (default 4173)
"""
import http.server, json, os, pathlib, socketserver, sys, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / "vercel.json").read_text())
REDIRECTS = {r["source"]: (r["destination"], 308 if r.get("permanent") else 307)
             for r in CONFIG.get("redirects", [])}
CLEAN = CONFIG.get("cleanUrls", False)
TRAILING = CONFIG.get("trailingSlash", False)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s\n" % (fmt % args))

    def _send_redirect(self, location, code=308):
        self.send_response(code)
        self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _serve(self, rel_path, status=200):
        target = ROOT / rel_path
        body = target.read_bytes()
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        # never let the preview serve a stale page against new markup
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        path = urllib.parse.unquote(parsed.path)
        query = ("?" + parsed.query) if parsed.query else ""

        # 1. configured redirects
        if path in REDIRECTS:
            dest, code = REDIRECTS[path]
            return self._send_redirect(dest + query, code)

        # 2. trailingSlash: false — /about/ is not a second URL for /about
        if not TRAILING and path != "/" and path.endswith("/"):
            return self._send_redirect(path.rstrip("/") + query, 308)

        # 3. cleanUrls — /about is the canonical form, /about.html redirects to it
        if CLEAN and path.endswith(".html") and path != "/404.html":
            clean = path[:-5]
            if clean.endswith("/index"):
                clean = clean[:-6] or "/"
            return self._send_redirect(clean + query, 308)

        # 4. the file itself
        rel = path.lstrip("/")
        if path == "/":
            return self._serve("index.html")
        if CLEAN and (ROOT / (rel + ".html")).is_file():
            return self._serve(rel + ".html")
        candidate = ROOT / rel
        if candidate.is_file():
            return super().do_GET()          # static asset: let the base class handle it
        if (candidate / "index.html").is_file():
            return self._serve(f"{rel}/index.html")

        # 5. not found — the real 404 page, with a real 404 status
        return self._serve("404.html", status=404)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    with Server(("127.0.0.1", port), Handler) as httpd:
        print(f"Derovest preview — http://127.0.0.1:{port}")
        print(f"  cleanUrls={CLEAN}  trailingSlash={TRAILING}  redirects={len(REDIRECTS)}")
        print("  Ctrl-C to stop\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")
