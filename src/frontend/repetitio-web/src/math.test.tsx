import { describe, expect, it } from "vitest";
import { normalizeMathSource } from "./math";
import { renderWikiMarkdownHtml } from "./wikiMarkdown";

describe("Wiki math without changing stored text", () => {
  it("renders the pasted external-sort expression next to prose and footnote digits", () => {
    const source = String.raw`Reduced to2$$ SORT(N) \stackrel{\text{def}}{=} O\left(\frac{N}{B} \log\_{\frac{M}{B}} \frac{N}{M} \right) $$Note that memory is limited.`;
    const html = renderWikiMarkdownHtml(source).html;
    expect(html).toContain('class="katex"');
    expect(html).not.toContain("wiki-math-error");
    expect(html).toContain("Note that memory is limited.");
    expect(html).toContain("<math");
    expect(source).toContain(String.raw`\log\_`);
  });
  it("repairs the copied aligned row separators only for rendering", () => {
    const source = String.raw`\begin{aligned} M_1 &= (A\_{11} + A\_{22})(B\_{11} + B\_{22}) & C\_{11} &= M_1 + M_4 - M_5 + M_7 \ M_2 &= (A\_{21} + A\_{22}) B\_{11} & C\_{12} &= M_3 + M_5 \ M_3 &= A\_{11} (B\_{21} - B\_{22}) \end{aligned}`;
    expect(normalizeMathSource(source)).toContain(String.raw`\\ M_2`);
    const html = renderWikiMarkdownHtml(`$$ ${source} $$`).html;
    expect(html).toContain('class="katex"');
    expect(html).not.toContain("wiki-math-error");
    expect(source).toContain(String.raw`\ M_2`);
    expect(html).not.toContain("wiki-equation-number");
  });
  it("supports inline, bracket and fenced math while preserving code and currency", () => {
    const source = "Inline $x^2$ and \\(\\frac{a}{b}\\).\n\n\\[x+y\\]\n\n```math\nx^2+y^2\n```\n\n`$raw$` costs $20 or $30.\n\n```text\n$$literal$$\n```";
    const document = new DOMParser().parseFromString(renderWikiMarkdownHtml(source).html, "text/html");
    expect(document.querySelectorAll(".katex")).toHaveLength(4);
    expect(document.body.textContent).toContain("costs $20 or $30");
    expect(document.querySelector("code")?.textContent).toBe("$raw$");
    expect(document.querySelector(".wiki-code-block code")?.textContent).toContain("$$literal$$");
  });
  it("preserves malformed formulas and does not execute trusted-HTML or URL commands", () => {
    const source = String.raw`$$\badcommand{<img src=x onerror=alert(1)>}$$`;
    const document = new DOMParser().parseFromString(renderWikiMarkdownHtml(source).html, "text/html");
    expect(document.querySelector(".wiki-math-error")).not.toBeNull();
    expect(document.querySelector("img")).toBeNull();
    const unsafe = new DOMParser().parseFromString(renderWikiMarkdownHtml(String.raw`$\href{javascript:alert(1)}{click}$`).html, "text/html");
    expect(unsafe.querySelector("a")).toBeNull();
  });
});
