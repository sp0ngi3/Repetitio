import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import { CodeEditor } from "./CodeEditor";
import { formatSourceCode } from "./codeFormatting";

vi.mock("./codeFormatting", () => ({ canFormatCode: () => true, formatSourceCode: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const view = () => EditorView.findFromDOM(screen.getByRole("textbox", { name: "Source code" }))!;

it("formats through the language formatter and can undo the whole change", async () => {
  vi.mocked(formatSourceCode).mockResolvedValue("class Test\n{\n    int value = 1;\n}");
  const onChange = vi.fn();
  render(<CodeEditor language="C#" value="class Test{int value=1;}" onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Format code" }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith("class Test\n{\n    int value = 1;\n}"));
  expect(formatSourceCode).toHaveBeenCalledWith("class Test{int value=1;}", "C#");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(view().state.doc.toString()).toBe("class Test{int value=1;}");
});

it("does not overwrite typing that happens while a format request is in flight", async () => {
  let finish!: (value: string) => void;
  vi.mocked(formatSourceCode).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  render(<CodeEditor language="C#" value="class Test{}" onChange={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Format code" }));
  act(() => view().dispatch({ changes: { from: 0, insert: "// Keep my edit\n" } }));
  await act(async () => finish("class Test\n{\n}"));
  expect(screen.getByRole("alert")).toHaveTextContent("Your edits were kept");
  expect(view().state.doc.toString()).toBe("// Keep my edit\nclass Test{}");
});

it("retains invalid code when formatting fails and never saves automatically", async () => {
  vi.mocked(formatSourceCode).mockRejectedValue(new Error("Fix syntax first"));
  const onChange = vi.fn();
  render(<CodeEditor language="C#" value="class Test{" onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Format code" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Fix syntax first");
  expect(onChange).not.toHaveBeenCalled();
});

it("touch tools insert at the caret, indent selections, undo, search and expand", () => {
  render(<CodeEditor language="Python" value={"a\nb"} onChange={vi.fn()} />);
  act(() => view().dispatch({ selection: { anchor: 0, head: 3 } }));
  fireEvent.click(screen.getByRole("button", { name: "Indent selection" }));
  expect(view().state.doc.toString()).toBe("    a\n    b");
  fireEvent.click(screen.getByRole("button", { name: "Outdent selection" }));
  expect(view().state.doc.toString()).toBe("a\nb");
  act(() => view().dispatch({ selection: { anchor: 1 } }));
  fireEvent.click(screen.getByRole("button", { name: "Insert {" }));
  expect(view().state.doc.toString()).toBe("a{\nb");
  fireEvent.click(screen.getByRole("button", { name: "Find and replace" }));
  expect(screen.getByLabelText("Find")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Expand editor" }));
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent.click(screen.getByRole("button", { name: "Exit expanded editor" }));
  expect(document.body.style.overflow).toBe("");
});

it("confirms clearing and keeps it undoable; read-only mode disables editing tools", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const { rerender } = render(<CodeEditor language="JSON" value="{}" onChange={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Clear code" }));
  expect(view().state.doc.toString()).toBe("{}");
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Clear code" }));
  expect(view().state.doc.toString()).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(view().state.doc.toString()).toBe("{}");
  rerender(<CodeEditor language="JSON" value="{}" disabled onChange={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Insert {" })).toBeDisabled();
  expect(screen.getByRole("textbox", { name: "Source code" })).toHaveAttribute("contenteditable", "false");
});
