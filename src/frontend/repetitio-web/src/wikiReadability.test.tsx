import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WikiMarkdownContent } from "./WikiMarkdownContent";
import { renderWikiMarkdownHtml } from "./wikiMarkdown";
import { parseWikiBatchImport } from "./wikiImport";
import { mappedScrollPosition, normalizeScrollAnchors } from "./wikiScrollSync";

const dialogMethods = ["showModal", "close"] as const;
const dialogDescriptors = dialogMethods.map(method => Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, method));
afterEach(() => {
  cleanup(); vi.restoreAllMocks();
  dialogMethods.forEach((method, index) => {
    const descriptor = dialogDescriptors[index];
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, method, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, method);
  });
});

it("keeps tables intact, assigns content-aware widths and retains Markdown alignment", () => {
  const long = "A complete explanation of reliability, operational constraints and failure recovery. ".repeat(8);
  const source = `| Item | Explanation | Count |\n| :--- | :---: | ---: |\n| Retry | ${long} | 42 |`;
  const document = new DOMParser().parseFromString(renderWikiMarkdownHtml(source).html, "text/html");
  const cells = document.querySelectorAll("tbody td");
  expect(cells).toHaveLength(3);
  expect(cells[1].textContent).toBe(long.trim());
  expect((cells[1] as HTMLElement).style.getPropertyValue("--wiki-column-min")).toBe("300px");
  expect((cells[2] as HTMLElement).style.getPropertyValue("--wiki-column-min")).toBe("120px");
  expect((cells[1] as HTMLElement).style.textAlign).toBe("center");
  expect((cells[2] as HTMLElement).style.textAlign).toBe("right");
  expect(document.querySelector("table")?.style.getPropertyValue("--wiki-table-min-width")).toBe("540px");
  expect(document.querySelector(".wiki-table-viewport")?.getAttribute("tabindex")).toBe("0");
});

it("expands the existing table with safe content and an accessible close control", async () => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
  render(<WikiMarkdownContent source={"| Topic | Definition |\n| --- | --- |\n| Event | `<script>` is plain text. |"} />);
  fireEvent.click(await screen.findByRole("button", { name: "Expand table" }));
  const modal = screen.getByRole("dialog", { name: "Expanded table" });
  expect(modal.querySelector("td")?.textContent).toBe("Event");
  expect(modal.querySelector("script")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Close table" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("renders JSON-edited definitions and nested recall answers without changing stored Markdown", () => {
  const [page] = parseWikiBatchImport(JSON.stringify({ pages: [{ title: "Events", sections: [{ heading: "Vocabulary", definitions: [
    { term: "**Delegate contract**", definition: "A signature shared by the publisher and subscribers.\n\n- Specifies parameters.\n- Specifies the return type." }
  ], blocks: [{ type: "recall", prompt: "Why is the publisher decoupled?", hint: "Look at the delegate.", answer: "It knows the contract, **not concrete subscribers**.\n\n```csharp\nChanged?.Invoke(message);\n```" }] }] }] }));
  const original = page.contentMarkdown!;
  const html = new DOMParser().parseFromString(renderWikiMarkdownHtml(original).html, "text/html");
  expect(html.querySelector(".wiki-definition dt strong")?.textContent).toBe("Delegate contract");
  expect(html.querySelectorAll(".wiki-definition dd li")).toHaveLength(2);
  expect(html.querySelectorAll(".wiki-learning-important details")).toHaveLength(2);
  expect(html.querySelector(".wiki-learning-important code")?.textContent).toBe("Changed?.Invoke(message);\n");
  expect(page.contentMarkdown).toBe(original);
});

it("maps source line ranges for text, images, definitions, tables and code, not JSON data", () => {
  const source = "## Topic\n\nBefore.\n\n![Image](wiki-image:00000000-0000-0000-0000-000000000001)\n\n:::definition Term\n\nExplanation.\n\n:::\n\n```python\nprint(1)\n```";
  const html = new DOMParser().parseFromString(renderWikiMarkdownHtml(source).html, "text/html");
  expect(html.querySelector("h3")?.dataset.sourceStart).toBe("0");
  expect(html.querySelector("img")?.closest("p")?.dataset.sourceStart).toBe("4");
  expect(html.querySelector<HTMLElement>(".wiki-definition")?.dataset.sourceStart).toBe("6");
  expect(html.querySelector<HTMLElement>(".wiki-code-block")?.dataset.sourceStart).toBe("12");
  expect(html.querySelector("img")?.getAttribute("src")).toContain("00000000-0000-0000-0000-000000000001");
});

it("uses piecewise block positions instead of whole-document ratios around large images", () => {
  const anchors = [{ source: 0, preview: 0 }, { source: 100, preview: 100 }, { source: 120, preview: 900 }, { source: 500, preview: 1280 }];
  expect(mappedScrollPosition(120, anchors, "source")).toBe(900);
  expect(mappedScrollPosition(110, anchors, "source")).toBe(500);
  expect(mappedScrollPosition(1000, anchors, "preview")).toBe(220);
  expect(mappedScrollPosition(-10, anchors, "source")).toBe(0);
  expect(mappedScrollPosition(10000, anchors, "source")).toBe(1280);
  expect(mappedScrollPosition(1, [], "source")).toBe(0);
});

it("removes invisible, duplicate and reversed geometry anchors", () => {
  expect(normalizeScrollAnchors([{ source: 20, preview: 40 }, { source: 0, preview: 0 },
    { source: 20, preview: 50 }, { source: 30, preview: 35 }, { source: NaN, preview: 70 }, { source: 40, preview: 80 }]))
    .toEqual([{ source: 0, preview: 0 }, { source: 20, preview: 40 }, { source: 40, preview: 80 }]);
});
