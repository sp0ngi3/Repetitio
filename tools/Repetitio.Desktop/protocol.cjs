const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");

const ORIGIN = "repetitio://app";
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-src 'none'";
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".webp": "image/webp" };

function isAppUrl(value) {
  try { const url = new URL(value); return url.protocol === "repetitio:" && url.hostname === "app" && !url.port && !url.username && !url.password; } catch { return false; }
}

function safeAssetPath(root, pathname) {
  const decoded = decodeURIComponent(pathname);
  if (decoded.includes("\\") || decoded.includes("\0") || decoded.includes(":")) throw new Error("Invalid asset path");
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const result = path.resolve(root, relative);
  const inside = path.relative(path.resolve(root), result);
  if (inside.startsWith("..") || path.isAbsolute(inside)) throw new Error("Asset path escapes the application");
  return result;
}

function createProtocolHandler(frontend, startupFile, getBackend, getBuild = () => null) {
  return async request => {
    try {
      if (!isAppUrl(request.url)) return new Response("Unknown application origin", { status: 403 });
      const url = new URL(request.url);
      if (url.pathname === "/__desktop/version" && request.method === "GET") {
        return Response.json(getBuild(), { headers: { "Cache-Control": "no-store" } });
      }
      if (url.pathname.startsWith("/api/")) {
        const backend = getBackend();
        if (!backend?.origin) return new Response("The local API is starting.", { status: 503 });
        // Keep multipart uploads and backup responses streaming rather than buffering image-heavy databases.
        const options = { method: request.method, headers: request.headers, signal: request.signal };
        if (request.method !== "GET" && request.method !== "HEAD") { options.body = request.body; options.duplex = "half"; }
        return await backend.request(url.pathname + url.search, options);
      }
      if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405 });
      const file = url.pathname === "/__desktop/startup" ? startupFile : safeAssetPath(frontend, url.pathname);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return new Response("Not found", { status: 404 });
      return new Response(request.method === "HEAD" ? null : Readable.toWeb(fs.createReadStream(file)), {
        headers: { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Content-Security-Policy": CSP,
          "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" }
      });
    } catch { return new Response("Unable to load this local resource. Check the desktop log.", { status: 502 }); }
  };
}

module.exports = { ORIGIN, CSP, isAppUrl, safeAssetPath, createProtocolHandler };
