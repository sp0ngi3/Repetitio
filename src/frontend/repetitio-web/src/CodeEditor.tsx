import type { KeyboardEvent, ReactNode } from "react";

const codeEditorIndent = "    ";

interface CodeEditorProps {
  id?: string;
  language: string;
  value: string;
  placeholder?: string;
  toolbarEnd?: ReactNode;
  onChange: (value: string) => void;
}

interface CodeEditorEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export function CodeEditor(props: CodeEditorProps) {
  const lineNumbers = createCodeLineNumbers(props.value);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();

    const textarea = event.currentTarget;
    const edit = event.shiftKey
      ? removeCodeEditorIndentation(textarea.value, textarea.selectionStart, textarea.selectionEnd)
      : addCodeEditorIndentation(textarea.value, textarea.selectionStart, textarea.selectionEnd);

    props.onChange(edit.value);

    requestAnimationFrame(() => {
      textarea.selectionStart = edit.selectionStart;
      textarea.selectionEnd = edit.selectionEnd;
    });
  }

  async function copyCode() {
    if (!props.value.trim()) {
      return;
    }

    await navigator.clipboard?.writeText(props.value);
  }

  return (
    <div className="dsa-code-editor">
      <div className="dsa-code-toolbar">
        <span>{props.language}</span>
        <div className="dsa-code-actions">
          {props.toolbarEnd}
          <button className="secondary-button compact-button" type="button" onClick={() => props.onChange(formatCode(props.value))}>
            Format
          </button>
          <button className="secondary-button compact-button" type="button" onClick={() => void copyCode()}>
            Copy
          </button>
          <button className="danger-button compact-button" type="button" onClick={() => props.onChange("")}>
            Clear
          </button>
        </div>
      </div>
      <div className="dsa-code-surface">
        <pre aria-hidden="true" className="dsa-code-lines">{lineNumbers}</pre>
        <textarea
          id={props.id}
          aria-label="Source code"
          className="code-input dsa-code-input"
          spellCheck={false}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={props.placeholder ?? "Paste or write your accepted solution."}
        />
      </div>
    </div>
  );
}

function createCodeLineNumbers(sourceCode: string) {
  const lineCount = Math.max(1, sourceCode.split("\n").length);
  return Array.from({ length: lineCount }, (_, index) => index + 1).join("\n");
}

function formatCode(sourceCode: string) {
  return sourceCode
    .replace(/\t/g, codeEditorIndent)
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

function addCodeEditorIndentation(value: string, selectionStart: number, selectionEnd: number): CodeEditorEdit {
  if (selectionStart === selectionEnd || !value.slice(selectionStart, selectionEnd).includes("\n")) {
    return {
      value: `${value.slice(0, selectionStart)}${codeEditorIndent}${value.slice(selectionEnd)}`,
      selectionStart: selectionStart + codeEditorIndent.length,
      selectionEnd: selectionStart + codeEditorIndent.length
    };
  }

  const lineStart = findLineStart(value, selectionStart);
  const lineEnd = findSelectedLineEnd(value, selectionStart, selectionEnd);
  const block = value.slice(lineStart, lineEnd);
  const lineCount = block.split("\n").length;
  const indentedBlock = block
    .split("\n")
    .map((line) => `${codeEditorIndent}${line}`)
    .join("\n");

  return {
    value: `${value.slice(0, lineStart)}${indentedBlock}${value.slice(lineEnd)}`,
    selectionStart: selectionStart + codeEditorIndent.length,
    selectionEnd: selectionEnd + lineCount * codeEditorIndent.length
  };
}

function removeCodeEditorIndentation(value: string, selectionStart: number, selectionEnd: number): CodeEditorEdit {
  const lineStart = findLineStart(value, selectionStart);
  const lineEnd = findSelectedLineEnd(value, selectionStart, selectionEnd);
  const block = value.slice(lineStart, lineEnd);
  let removedBeforeSelection = 0;
  let removedInsideSelection = 0;
  let offset = lineStart;

  const outdentedBlock = block
    .split("\n")
    .map((line) => {
      const removeCount = line.startsWith(codeEditorIndent) ? codeEditorIndent.length : line.startsWith("\t") ? 1 : 0;

      if (removeCount > 0) {
        if (offset < selectionStart) {
          removedBeforeSelection += Math.min(removeCount, selectionStart - offset);
        }

        if (offset < selectionEnd) {
          removedInsideSelection += removeCount;
        }
      }

      offset += line.length + 1;
      return line.slice(removeCount);
    })
    .join("\n");

  return {
    value: `${value.slice(0, lineStart)}${outdentedBlock}${value.slice(lineEnd)}`,
    selectionStart: Math.max(lineStart, selectionStart - removedBeforeSelection),
    selectionEnd: Math.max(lineStart, selectionEnd - removedInsideSelection)
  };
}

function findLineStart(value: string, selectionStart: number) {
  return value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
}

function findSelectedLineEnd(value: string, selectionStart: number, selectionEnd: number) {
  if (selectionStart === selectionEnd) {
    const nextLineBreak = value.indexOf("\n", selectionEnd);
    return nextLineBreak === -1 ? value.length : nextLineBreak;
  }

  return value[selectionEnd - 1] === "\n" ? selectionEnd - 1 : selectionEnd;
}
