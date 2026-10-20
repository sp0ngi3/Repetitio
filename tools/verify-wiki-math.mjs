import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const { chromium } = createRequire(import.meta.url)("playwright");
const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontend = path.join(workspace, "src/frontend/repetitio-web");
const root = path.join(workspace, ".artifacts", "math-verification", String(Date.now()));
await mkdir(root, { recursive: true });
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const site = `http://127.0.0.1:${port}`;
const children = [];
let browser;
function start(executable, args, cwd, env, match) {
  const child = spawn(executable, args, { cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(output.slice(-4000))), 120000);
    const receive = chunk => {
      output += chunk;
      const result = output.match(match);
      if (result) { clearTimeout(timeout); resolve(result[1]); }
    };
    child.stdout.on("data", receive); child.stderr.on("data", receive);
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("exit", code => { clearTimeout(timeout); reject(new Error(`Test service exited (${code}): ${output.slice(-4000)}`)); });
  });
}
try {
  const api = await start("dotnet", [path.join(workspace, "src/backend/Repetitio.Api/bin/Debug/net10.0/Repetitio.Api.dll")], workspace, {
    ASPNETCORE_ENVIRONMENT: "Production", ASPNETCORE_URLS: "http://127.0.0.1:0", Desktop__Enabled: "false",
    ConnectionStrings__Repetitio: `Data Source="${path.join(root, "data", "repetitio.db")}";Pooling=False`, Backup__Directory: path.join(root, "backups"),
    Cors__AllowedOrigins__0: site
  }, /Now listening on:\s*(http:\/\/127\.0\.0\.1:\d+)/);
  await start(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(port)], frontend,
    { VITE_API_BASE_URL: api }, /(http:\/\/127\.0\.0\.1:\d+\/)/);
  const source = String.raw`## External sorting

The total complexity is reduced to2$$ SORT(N) \stackrel{\text{def}}{=} O\left(\frac{N}{B} \log\_{\frac{M}{B}} \frac{N}{M}\right) $$Note that $N$ is the dataset size.

## Matrix multiplication

$$ \begin{aligned} M_1 &= (A\_{11} + A\_{22})(B\_{11} + B\_{22}) & C\_{11} &= M_1 + M_4 - M_5 + M_7 \ M_2 &= (A\_{21} + A\_{22}) B\_{11} & C\_{12} &= M_3 + M_5 \ M_3 &= A\_{11} (B\_{21} - B\_{22}) & C\_{21} &= M_2 + M_4 \end{aligned} $$

## Inline expressions

Read \(\frac{M}{B}\) blocks and use $O(N \log N)$ work.
`;
  const title = "Math readability verification";
  const created = await fetch(api + "/api/wiki/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, contentMarkdown: source }) });
  assert(created.ok, await created.text().catch(() => "Unable to create fixture"));
  browser = await chromium.launch({ headless: true, channel: "msedge" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => { window.print = () => {}; });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(site);
  await page.getByText("DB online", { exact: true }).waitFor();
  for (const style of ["Professional", "Vaporwave"]) for (const mode of ["Light", "Dark"]) {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: style, exact: true }).check();
    await page.getByRole("radio", { name: mode, exact: true }).check();
    await page.getByRole("button", { name: "Wiki", exact: true }).click();
    await page.getByRole("textbox", { name: "Search topic tree" }).fill(title);
    await page.getByRole("button", { name: title, exact: true }).first().click();
    await page.locator(".official-wiki-content .katex").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator(".wiki-math-error").count(), 0);
    assert.equal(await page.locator(".wiki-equation-number").count(), 0);
    assert(await page.evaluate(() => document.fonts.check("16px KaTeX_Main")));
    assert.match(await page.getByTestId("app-version").textContent(), /^v0\.3\.0/);
    await page.screenshot({ path: path.join(root, `${style}-${mode}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Math must not force horizontal page scrolling on mobile");
  await page.screenshot({ path: path.join(root, "mobile.png"), fullPage: true });
  const popupReady = page.waitForEvent("popup");
  await page.getByRole("button", { name: /Download PDF/ }).click();
  const popup = await popupReady;
  await popup.locator(".print-article .katex").first().waitFor();
  await popup.evaluate(() => document.fonts.ready);
  assert(await popup.evaluate(() => document.fonts.check("16px KaTeX_Main")), "PDF math fonts must remain local and available");
  assert.equal(await popup.locator(".wiki-math-error").count(), 0);
  await popup.close();
  assert.deepEqual(errors, []);
  console.log(`Verified both supplied equations, local KaTeX fonts, all four appearances, mobile overflow, footer version and printable math. Screenshots: ${root}`);
} finally {
  await browser?.close();
  for (const child of children.reverse()) if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
}
