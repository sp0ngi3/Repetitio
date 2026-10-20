const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { streamRequest } = require("../streamRequest.cjs");

test("backup transport streams multipart uploads and delayed downloads without a fetch header deadline", async () => {
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    assert.match(Buffer.concat(chunks).toString(), /valuable backup bytes/);
    assert.match(request.headers["content-type"], /multipart\/form-data/);
    await new Promise(resolve => setTimeout(resolve, 50));
    response.writeHead(200, { "Content-Type": "application/zip" });
    response.write("first chunk");
    setTimeout(() => response.end(" second chunk"), 20);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const form = new FormData();
    form.append("file", new Blob(["valuable backup bytes"]), "backup.zip");
    const response = await streamRequest(`http://127.0.0.1:${server.address().port}/api/backup/import`, { method: "POST", body: form });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "first chunk second chunk");
  } finally { await new Promise(resolve => server.close(resolve)); }
});
