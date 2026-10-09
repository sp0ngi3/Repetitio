import { afterEach, expect, it, vi } from "vitest";
import { renderDiagramSvg, validateDiagramSource, renderPrintableDiagrams } from "./diagramRenderer";

const { render, initialize } = vi.hoisted(() => ({ render: vi.fn(), initialize: vi.fn() }));
vi.mock("mermaid", () => ({ default: { render, initialize } }));
const palette = { surface: "#fff", text: "#111", accent: "#08685d", border: "#555", font: "Arial" };
afterEach(() => vi.clearAllMocks());

it.each(["%%{init: {securityLevel: 'loose'}}%%\nflowchart LR\n A --> B", "---\nconfig: {}\n---\nflowchart LR\n A --> B", "flowchart LR\nA[<script>alert(1)</script>]", "flowchart LR\nA --> B\nclick A \"https://example.com\"", "flowchart LR\nclassDef remote fill:url(data:bad)", "x".repeat(40_001)])("rejects unsafe or oversized diagrams before rendering", source => {
  expect(() => validateDiagramSource(source)).toThrow();
  expect(render).not.toHaveBeenCalled();
});

it("sanitizes rendered SVG and uses strict local configuration", async () => {
  render.mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><foreignObject><div>bad</div></foreignObject><image href="https://example.com/a.png"/><text>Publisher</text></svg>' });
  const svg = await renderDiagramSvg("flowchart LR\n Publisher --> Subscriber", palette);
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  expect(doc.querySelector("script, foreignObject, image, [onload]")).toBeNull();
  expect(doc.querySelector("text")?.textContent).toBe("Publisher");
  expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ startOnLoad: false, securityLevel: "strict", htmlLabels: false }));
  expect(document.querySelector(".diagram-render-host")).toBeNull();
});

it("does not let a malformed diagram prevent the next render or remove printable source", async () => {
  render.mockRejectedValueOnce(new Error("Invalid syntax")).mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>Next diagram</text></svg>' });
  await expect(renderDiagramSvg("malformed", palette)).rejects.toThrow("Invalid syntax");
  await expect(renderDiagramSvg("flowchart LR\nA --> B", palette)).resolves.toContain("Next diagram");
  const target = new DOMParser().parseFromString('<section class="wiki-diagram-block"><div class="wiki-diagram-preview"></div><pre><code>flowchart LR\nA --> B</code></pre></section>', "text/html");
  await renderPrintableDiagrams(target);
  expect(target.querySelector(".wiki-diagram-preview svg")).not.toBeNull();
  expect(target.querySelector("code")?.textContent).toBe("flowchart LR\nA --> B");
});
