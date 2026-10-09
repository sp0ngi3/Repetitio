import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { codeLanguageLabel, highlightCode } from "./codeHighlight";
import { WikiMarkdownContent } from "./WikiMarkdownContent";
import { renderWikiMarkdownHtml } from "./wikiMarkdown";
import { CodeEditor } from "./CodeEditor";

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each([
  ["C#", 'public class Publisher { public event Action<string>? Changed; }', "hljs-keyword"],
  ["py", 'def notify(value):\n    print("event", value)', "hljs-keyword"],
  ["yml", 'services:\n  api:\n    image: "repetitio:latest"\n    ports: ["8080:8080"]', "hljs-attr"],
  ["Dockerfile", "FROM alpine:3.20\nRUN echo hello", "hljs-keyword"]
])("highlights %s without changing code content", (language, source, token) => {
  const element = document.createElement("code");
  element.innerHTML = highlightCode(source, language);
  expect(element.textContent).toBe(source);
  expect(element.querySelector(`.${token}`)).not.toBeNull();
});

it("retains unknown-language and ASCII source while escaping HTML", () => {
  const source = '<script>alert("bad")</script>\nA --> B';
  const element = document.createElement("code");
  element.innerHTML = highlightCode(source, "unknown-language");
  expect(element.textContent).toBe(source);
  expect(element.querySelector("script")).toBeNull();
  expect(codeLanguageLabel("yml")).toBe("YAML / Compose");
});

it("makes article readiness checklists clickable and restores page-local state without changing Markdown", async () => {
  const source = "## Readiness\n\n- [ ] Explain how an **event** decouples publishers and subscribers.";
  const first = render(<WikiMarkdownContent source={source} checklistScope="page-a" />);
  const box = screen.getByRole("checkbox", { name: "Explain how an event decouples publishers and subscribers." });
  fireEvent.click(screen.getByText("event"));
  expect(box).toBeChecked();
  expect(Object.values(JSON.parse(localStorage.getItem("repetitio-wiki-checklists:page-a")!))).toEqual([true]);
  first.unmount();
  const second = render(<WikiMarkdownContent source={"Additional explanation.\n\n" + source} checklistScope="page-a" />);
  expect(screen.getByRole("checkbox")).toBeChecked();
  second.unmount();
  render(<WikiMarkdownContent source={source} checklistScope="page-b" />);
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  expect(source).toContain("[ ]");
});

it("keeps previews and printable checklist states read-only", () => {
  render(<WikiMarkdownContent source="- [x] Already completed" interactive={false} />);
  expect(screen.getByRole("checkbox")).toBeChecked();
  expect(screen.getByRole("checkbox")).toBeDisabled();
  expect(renderWikiMarkdownHtml("- [ ] Ready", true).html).toContain(" disabled");
});

it("does not carry checked state into another page with identical content", () => {
  const source = "- [ ] Explain the mechanism.";
  const view = render(<WikiMarkdownContent source={source} checklistScope="page-a" />);
  fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("checkbox")).toBeChecked();
  view.rerender(<WikiMarkdownContent source={source} checklistScope="page-b" />);
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  view.rerender(<WikiMarkdownContent source={source} checklistScope="page-a" />);
  expect(screen.getByRole("checkbox")).toBeChecked();
});

it("copies the original code rather than HTML tokens or the language label", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  render(<WikiMarkdownContent source={'```python\ndef greet():\n    print("Hello")\n```'} />);
  fireEvent.click(await screen.findByRole("button", { name: "Copy code" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('def greet():\n    print("Hello")\n'));
  expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  vi.unstubAllGlobals();
});

it("preserves highlighted editor typing, scroll alignment and accessible source", () => {
  const onChange = vi.fn();
  const { container } = render(<CodeEditor language="C#" value="public int value = 42;" onChange={onChange} />);
  const source = screen.getByRole("textbox", { name: "Source code" });
  expect(source).toHaveValue("public int value = 42;");
  expect(container.querySelector(".dsa-code-highlight .hljs-keyword")).not.toBeNull();
  fireEvent.change(source, { target: { value: "public int value = 43;" } });
  expect(onChange).toHaveBeenCalledWith("public int value = 43;");
  fireEvent.scroll(source, { target: { scrollTop: 64, scrollLeft: 90 } });
  expect(container.querySelector(".dsa-code-highlight")?.scrollTop).toBe(64);
  expect(container.querySelector(".dsa-code-highlight")?.scrollLeft).toBe(90);
  expect(container.querySelector(".dsa-code-lines")?.scrollTop).toBe(64);
});
