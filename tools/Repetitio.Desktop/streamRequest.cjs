const http = require("node:http");
const { Readable } = require("node:stream");

// Backup preparation can legitimately take longer than fetch's header deadline.
function streamRequest(url, options) {
  const request = new Request(url, options);
  return new Promise((resolve, reject) => {
    const outgoing = http.request(url, { method: request.method, headers: Object.fromEntries(request.headers) }, incoming => {
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (["connection", "keep-alive", "transfer-encoding", "upgrade"].includes(name)) continue;
        if (value !== undefined) for (const entry of Array.isArray(value) ? value : [value]) headers.append(name, entry);
      }
      resolve(new Response(Readable.toWeb(incoming), { status: incoming.statusCode, statusText: incoming.statusMessage, headers }));
      incoming.once("close", () => request.signal.removeEventListener("abort", abort));
    });
    const abort = () => outgoing.destroy(request.signal.reason instanceof Error ? request.signal.reason : new Error("Backup request cancelled."));
    outgoing.once("error", error => { request.signal.removeEventListener("abort", abort); reject(error); });
    request.signal.addEventListener("abort", abort, { once: true });
    if (request.signal.aborted) { abort(); return; }
    if (request.body) {
      const body = Readable.fromWeb(request.body);
      body.once("error", error => outgoing.destroy(error));
      outgoing.once("close", () => body.destroy());
      body.pipe(outgoing);
    } else outgoing.end();
  });
}

module.exports = { streamRequest };
