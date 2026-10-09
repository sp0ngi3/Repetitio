import { expect, it } from "vitest";
import { parseWikiBatchImport, sampleImport } from "./WikiPage";
import { renderWikiMarkdownHtml } from "./wikiMarkdown";

const legacyPage = {
  title: "Hash tables", slug: "hash-tables", summary: "Store values by key.",
  lead: ["A hash table maps keys to values."], infobox: { Area: "Data structures" },
  sections: [{
    heading: "Collision handling", quote: "Different keys may share a bucket.",
    paragraphs: ["Collisions require a resolution strategy."], list: ["Chaining", "Open addressing"],
    steps: ["Hash the key", "Resolve collisions"],
    table: { headers: ["Strategy", "Cost"], rows: [["Chaining", "Extra nodes"]] },
    code: { language: "csharp", content: "var map = new Dictionary<int, int>();\nmap[1] = 2;" },
    sections: [{ heading: "Resizing", paragraphs: ["Rehash when the table grows."] }]
  }],
  seeAlso: [], references: [], externalLinks: [],
  sources: [{ title: "Provided study material", type: "Book", author: "Provided source", locator: "Chapter 1", notes: "Hash tables." }],
  quizQuestions: [{ prompt: "Hash table: what resolves a collision?", explanation: "Chaining stores colliding entries in the bucket.", options: [
    { text: "Sorting every lookup", isCorrect: false }, { text: "Chaining", isCorrect: true },
    { text: "Ignoring the second key", isCorrect: false }, { text: "Removing the hash function", isCorrect: false }
  ] }],
  flashcards: [{ front: "Hash table: what is a collision?", back: "Different keys map to the same bucket." }],
  children: [{ title: "Load factor", slug: "load-factor", lead: ["Entries divided by bucket count."],
    sections: [], sources: [], quizQuestions: [], flashcards: [], children: [] }]
};

it("accepts the old prompt's full page schema and preserves normalized Markdown, sources and checks", () => {
  const [page] = parseWikiBatchImport(JSON.stringify({ pages: [legacyPage] }));
  expect(page.contentMarkdown).toBe([
    "| Property | Value |\n| --- | --- |\n| Area | Data structures |",
    "A hash table maps keys to values.",
    "## Collision handling\n\nCollisions require a resolution strategy.\n\n> Different keys may share a bucket.\n\n- Chaining\n- Open addressing\n\n1. Hash the key\n2. Resolve collisions\n\n| Strategy | Cost |\n| --- | --- |\n| Chaining | Extra nodes |\n\n```csharp\nvar map = new Dictionary<int, int>();\nmap[1] = 2;\n```\n\n### Resizing\n\nRehash when the table grows."
  ].join("\n\n"));
  expect(page.sources).toEqual(legacyPage.sources);
  expect(page.quizQuestions).toEqual(legacyPage.quizQuestions);
  expect(page.flashcards).toEqual(legacyPage.flashcards);
  expect(page.children?.[0]).toMatchObject({ title: "Load factor", slug: "load-factor", contentMarkdown: "Entries divided by bucket count." });
  const html = renderWikiMarkdownHtml(page.contentMarkdown!);
  expect(html.headings.map(heading => heading.text)).toEqual(["Collision handling", "Resizing"]);
  const document = new DOMParser().parseFromString(html.html, "text/html");
  expect(document.querySelector("table")).not.toBeNull();
  expect(document.querySelector("blockquote")?.textContent).toContain("Different keys may share a bucket.");
});

it("retains page-array imports, aliases, Markdown precedence and nested children", () => {
  const input = [{ title: "Raw", contentMarkdown: "## Original\n\nExisting text.",
    sections: [{ heading: "Ignored with raw Markdown", blocks: [{ type: "recall" }] }],
    quiz: legacyPage.quizQuestions, references: [{ title: "Reference book", kind: "Book", authors: "A", chapter: "2", note: "Legacy alias" }],
    children: [{ title: "Child", sections: [{ title: "Legacy blocks", bullets: ["Bullet"], orderedList: ["Step"],
      blocks: ["Extra paragraph", { type: "list", items: ["Old block list"] }, { type: "steps", items: ["Old block step"] }] }],
      children: [{ title: "Grandchild", contentMarkdown: "Unchanged." }] }]
  }];
  const [page] = parseWikiBatchImport(JSON.stringify(input));
  expect(page.contentMarkdown).toBe(input[0].contentMarkdown);
  expect(page.quizQuestions).toEqual(legacyPage.quizQuestions);
  expect(page.sources?.[0]).toEqual({ title: "Reference book", type: "Book", author: "A", locator: "2", notes: "Legacy alias", url: undefined });
  expect(page.children?.[0].contentMarkdown).toContain("- Old block list");
  expect(page.children?.[0].contentMarkdown).toContain("1. Old block step");
  expect(page.children?.[0].children?.[0].contentMarkdown).toBe("Unchanged.");
});

it("renders the exact JSON structure shown in the UI with nested lists and all learning blocks", () => {
  const [page] = parseWikiBatchImport(sampleImport);
  const document = new DOMParser().parseFromString(renderWikiMarkdownHtml(page.contentMarkdown!).html, "text/html");
  expect(document.querySelector("li ul")?.textContent).toContain("Choose an invariant.");
  expect(document.querySelector(".wiki-definition dt")?.textContent).toBe("Invariant");
  expect(document.querySelector(".wiki-learning-pitfall")?.textContent).toContain("Initializing the maximum to zero");
  expect(document.querySelector(".wiki-learning-example")?.textContent).toContain("-2");
  expect(document.querySelector(".wiki-learning-takeaways")?.textContent).toContain("O(n)");
  expect(document.querySelectorAll("input[type=checkbox][disabled]")).toHaveLength(2);
  expect(document.querySelectorAll("details:not([open])").length).toBeGreaterThanOrEqual(3);
  expect(document.querySelector("details summary")?.textContent).toBe("Show hint");
  expect(document.querySelector(".wiki-code-block code")?.textContent).toContain("\n");
  expect(page.quizQuestions?.length).toBeGreaterThan(0);
  expect(page.flashcards?.length).toBeGreaterThan(0);
});

it("renders nested ordered lists, optional section fields and escaped table cells", () => {
  const [page] = parseWikiBatchImport(JSON.stringify({ pages: [{ title: "Lists", sections: [{ heading: "Process",
    steps: [{ text: "First", items: ["Nested step", { text: "Next", items: ["Deep step"] }] }, "Second"],
    definitions: [{ term: "Term", definition: "Definition" }],
    checklist: [{ text: "Verified", checked: true }], takeaways: ["Remember this"],
    table: { headers: ["Value"], rows: [["left | right"]] }
  }] }] }));
  const document = new DOMParser().parseFromString(renderWikiMarkdownHtml(page.contentMarkdown!).html, "text/html");
  expect(document.querySelector("li ol li ol")?.textContent).toContain("Deep step");
  expect(document.querySelector("input[checked][disabled]")).not.toBeNull();
  expect(document.querySelector("td")?.textContent).toBe("left | right");
  expect(document.querySelector(".wiki-learning-takeaways")?.textContent).toContain("Remember this");
});

it("expands hidden answers for PDF while preserving the same content and headings", () => {
  const [page] = parseWikiBatchImport(sampleImport);
  const article = renderWikiMarkdownHtml(page.contentMarkdown!);
  const pdf = renderWikiMarkdownHtml(page.contentMarkdown!, true);
  const document = new DOMParser().parseFromString(pdf.html, "text/html");
  expect(document.querySelectorAll("details:not([open])")).toHaveLength(0);
  expect(document.querySelector("details[open]")).not.toBeNull();
  expect(pdf.headings).toEqual(article.headings);
  expect(document.body.textContent).toContain("Initialize best to the first element instead.");
});

it("escapes arbitrary HTML and unsafe URLs in old Markdown and new container labels", () => {
  const input = ':::tip <img src=x onerror=alert(1)>\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n:::';
  const document = new DOMParser().parseFromString(renderWikiMarkdownHtml(input).html, "text/html");
  expect(document.querySelector("script, img, [onerror], a[href^='javascript:']")).toBeNull();
  expect(document.body.textContent).toContain("<script>");
});

it.each([
  [{ type: "recall", prompt: "Question" }, "answer"],
  [{ type: "callout", kind: "typo", text: "Text" }, "kind"],
  [{ type: "definitions", items: [{ term: "Term" }] }, "definition"],
  [{ type: "checklist", items: [{ text: "Task", checked: "false" }] }, "checked"],
  [{ type: "list", items: [{ items: ["Child"] }] }, "text"]
])("rejects invalid optional learning blocks before importing (%s)", (block, field) => {
  expect(() => parseWikiBatchImport(JSON.stringify({ pages: [{ title: "Bad", sections: [{ heading: "Section", blocks: [block] }] }] })))
    .toThrow(new RegExp(String(field)));
});

it("keeps embedded Markdown fences inside code examples", () => {
  const [page] = parseWikiBatchImport(JSON.stringify({ pages: [{ title: "Code", sections: [{ heading: "Example", code: { language: "text", content: "```csharp\nvar n = 1;\n```" } }] }] }));
  const document = new DOMParser().parseFromString(renderWikiMarkdownHtml(page.contentMarkdown!).html, "text/html");
  expect(document.querySelector("code")?.textContent).toBe("```csharp\nvar n = 1;\n```\n");
});
