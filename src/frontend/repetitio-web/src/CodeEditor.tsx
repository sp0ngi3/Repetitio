import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { basicSetup } from "codemirror";
import { Compartment, EditorSelection, EditorState, Transaction, type Extension } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { indentLess, indentMore, redo, undo } from "@codemirror/commands";
import { HighlightStyle, indentUnit, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { openSearchPanel } from "@codemirror/search";
import { tags } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { sql } from "@codemirror/lang-sql";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { csharp } from "@codemirror/legacy-modes/mode/clike";
import { go } from "@codemirror/legacy-modes/mode/go";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { Braces, Check, ChevronLeft, ChevronRight, Copy, IndentDecrease, IndentIncrease, Maximize2, Minimize2,
  Redo2, Search, Trash2, Undo2, WrapText, ZoomIn, ZoomOut } from "lucide-react";
import { codeLanguageLabel, normalizeCodeLanguage } from "./codeHighlight";
import { canFormatCode, formatSourceCode } from "./codeFormatting";
import "./codeEditor.css";

interface CodeEditorProps {
  id?: string;
  language: string;
  value: string;
  placeholder?: string;
  toolbarEnd?: ReactNode;
  label?: string;
  onFormat?: () => void;
  copyAction?: ReactNode;
  allowClear?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function languageSupport(language: string): Extension {
  switch (normalizeCodeLanguage(language)) {
    case "csharp": return StreamLanguage.define(csharp);
    case "python": return python();
    case "javascript": return javascript({ jsx: true });
    case "typescript": return javascript({ typescript: true, jsx: true });
    case "json": return json();
    case "yaml": return yaml();
    case "cpp": return cpp();
    case "java": return java();
    case "sql": return sql();
    case "css": return css();
    case "xml": return html();
    case "go": return StreamLanguage.define(go);
    case "bash": return StreamLanguage.define(shell);
    default: return [];
  }
}

const colors = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.keyword, color: "var(--editor-keyword)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--editor-string)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--editor-number)" },
  { tag: tags.comment, color: "var(--muted)", fontStyle: "italic" },
  { tag: [tags.typeName, tags.className], color: "var(--editor-type)" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "var(--editor-function)" },
  { tag: tags.invalid, textDecoration: "underline wavy var(--danger)" }
]));

export function CodeEditor(props: CodeEditorProps) {
  const anchor = useRef<HTMLDivElement>(null);
  const [portalHost] = useState(() => document.createElement("div"));
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [compartments] = useState(() => ({ language: new Compartment(), wrapping: new Compartment(),
    editable: new Compartment(), attributes: new Compartment(), dark: new Compartment() }));
  const [wrap, setWrap] = useState(() => window.matchMedia?.("(max-width: 700px)").matches ?? false);
  const [expanded, setExpanded] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [position, setPosition] = useState({ line: 1, column: 1 });
  const [formatting, setFormatting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  const formatRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    // Keep the same editor DOM and undo history, outside animated ancestors when expanded.
    (expanded ? document.body : anchor.current)?.appendChild(portalHost);
    viewRef.current?.requestMeasure();
    return () => { portalHost.remove(); };
  }, [expanded, portalHost]);

  useEffect(() => {
    mounted.current = true;
    const view = new EditorView({ parent: host.current!, state: EditorState.create({ doc: latest.current.value,
      extensions: [basicSetup, colors, indentUnit.of("    "), EditorState.tabSize.of(4),
        keymap.of([{ key: "Tab", run: view => view.state.selection.main.empty ? insertSpaces(view) : indentMore(view), shift: indentLess },
          { key: "Mod-Shift-f", run: () => { formatRef.current(); return true; } }]),
        compartments.language.of(languageSupport(latest.current.language)),
        compartments.wrapping.of(wrap ? EditorView.lineWrapping : []),
        compartments.editable.of([EditorState.readOnly.of(!!latest.current.disabled), EditorView.editable.of(!latest.current.disabled)]),
        compartments.attributes.of(EditorView.contentAttributes.of(editorAttributes(latest.current))),
        compartments.dark.of(EditorView.theme({}, { dark: document.documentElement.dataset.theme === "dark" })),
        placeholder(latest.current.placeholder ?? "Write your solution here."),
        EditorView.updateListener.of(update => {
          if (update.docChanged) { latest.current.onChange(update.state.doc.toString()); setCopied(false); }
          if (update.selectionSet || update.docChanged) {
            const cursor = update.state.selection.main.head;
            const line = update.state.doc.lineAt(cursor);
            setPosition({ line: line.number, column: cursor - line.from + 1 });
          }
        })]
    }) });
    viewRef.current = view;
    const observer = new MutationObserver(() => view.dispatch({ effects: compartments.dark.reconfigure(
      EditorView.theme({}, { dark: document.documentElement.dataset.theme === "dark" })) }));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { mounted.current = false; observer.disconnect(); viewRef.current = null; view.destroy(); };
  }, [compartments]);

  useEffect(() => {
    const view = viewRef.current;
    if (view && props.value !== view.state.doc.toString()) view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: props.value }, annotations: Transaction.addToHistory.of(false)
    });
  }, [props.value]);
  useEffect(() => { viewRef.current?.dispatch({ effects: compartments.language.reconfigure(languageSupport(props.language)) }); }, [props.language, compartments]);
  useEffect(() => { viewRef.current?.dispatch({ effects: compartments.wrapping.reconfigure(wrap ? EditorView.lineWrapping : []) }); }, [wrap, compartments]);
  useEffect(() => { viewRef.current?.dispatch({ effects: compartments.editable.reconfigure([
    EditorState.readOnly.of(!!props.disabled), EditorView.editable.of(!props.disabled)]) }); }, [props.disabled, compartments]);
  useEffect(() => { viewRef.current?.dispatch({ effects: compartments.attributes.reconfigure(EditorView.contentAttributes.of(editorAttributes(props))) }); }, [props.id, props.label, compartments]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    const shell = anchor.current?.closest<HTMLElement>(".app-shell");
    const wasInert = shell?.inert ?? false;
    document.body.style.overflow = "hidden";
    if (shell) shell.inert = true;
    viewRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) setExpanded(false); };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; if (shell) shell.inert = wasInert; window.removeEventListener("keydown", escape); };
  }, [expanded]);

  function edit(command: (view: EditorView) => boolean) {
    if (!viewRef.current || latest.current.disabled) return;
    command(viewRef.current); viewRef.current.focus();
  }
  function insert(text: string) {
    edit(view => { view.dispatch(view.state.replaceSelection(text), { scrollIntoView: true, userEvent: "input" }); return true; });
  }
  async function format() {
    const view = viewRef.current;
    if (!view || formatting || latest.current.disabled) return;
    if (latest.current.onFormat) { latest.current.onFormat(); return; }
    const source = view.state.doc.toString();
    const language = latest.current.language;
    setFormatting(true); setError(null);
    try {
      const formatted = await formatSourceCode(source, language);
      if (!mounted.current) return;
      if (view !== viewRef.current || view.state.doc.toString() !== source || latest.current.language !== language || latest.current.disabled) {
        setError("Code changed while formatting. Your edits were kept; format again when ready."); return;
      }
      const cursor = Math.min(view.state.selection.main.head, formatted.length);
      view.dispatch({ changes: { from: 0, to: source.length, insert: formatted },
        selection: EditorSelection.cursor(cursor), userEvent: "input.format" });
      view.focus();
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : "Unable to format. Your code has not been changed."); }
    finally { if (mounted.current) setFormatting(false); }
  }
  formatRef.current = () => { if (latest.current.onFormat || canFormatCode(latest.current.language)) void format(); };
  async function copy() {
    try { await navigator.clipboard.writeText(viewRef.current?.state.doc.toString() ?? props.value); setCopied(true); }
    catch { setError("Clipboard is unavailable. Select the code and copy it from the editor."); }
  }
  function tool(label: string, icon: ReactNode, action: () => void, pressed?: boolean, disabled = !!props.disabled) {
    return <button type="button" className="code-tool" title={label} aria-label={label} aria-pressed={pressed} disabled={disabled}
      onMouseDown={event => event.preventDefault()} onClick={action}>{icon}</button>;
  }

  return <div ref={anchor} className="code-workbench-anchor">{createPortal(<div className={`code-workbench${expanded ? " code-workbench-expanded" : ""}`}
    role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={expanded ? "Expanded code editor" : undefined}
    style={{ "--editor-font-size": `${fontSize}px` } as CSSProperties}>
    <div className="code-workbench-header">
      <strong>{codeLanguageLabel(props.language)}</strong>
      <div className="code-workbench-actions">
        {props.toolbarEnd}
        {props.onFormat || canFormatCode(props.language) ? tool(formatting ? "Formatting code" : "Format code", <Braces size={18} />, () => void format(), undefined, !!props.disabled || formatting) : null}
        {props.copyAction ?? tool(copied ? "Copied code" : "Copy code", copied ? <Check size={18} /> : <Copy size={18} />, () => void copy())}
        {tool("Find and replace", <Search size={18} />, () => { if (viewRef.current) openSearchPanel(viewRef.current); })}
        {tool("Wrap lines", <WrapText size={18} />, () => setWrap(value => !value), wrap, false)}
        {tool(expanded ? "Exit expanded editor" : "Expand editor", expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />, () => setExpanded(value => !value), expanded, false)}
      </div>
    </div>
    <div className="code-touch-toolbar" role="toolbar" aria-label="Code editing tools">
      {tool("Undo", <Undo2 size={17} />, () => edit(undo))}
      {tool("Redo", <Redo2 size={17} />, () => edit(redo))}
      <span className="code-tool-divider" />
      {tool("Indent selection", <IndentIncrease size={17} />, () => edit(indentMore))}
      {tool("Outdent selection", <IndentDecrease size={17} />, () => edit(indentLess))}
      {tool("Insert tab", <span aria-hidden="true">Tab</span>, () => edit(insertSpaces))}
      {["{", "}", "(", ")", "[", "]", ";", "=", ":"].map(symbol => <button type="button" className="code-tool code-symbol" key={symbol}
        disabled={props.disabled} title={`Insert ${symbol}`} aria-label={`Insert ${symbol}`} onMouseDown={event => event.preventDefault()} onClick={() => insert(symbol)}>{symbol}</button>)}
      {tool("Move cursor left", <ChevronLeft size={17} />, () => edit(view => { const head = view.state.selection.main.head; view.dispatch({ selection: { anchor: Math.max(0, head - 1) }, scrollIntoView: true }); return true; }))}
      {tool("Move cursor right", <ChevronRight size={17} />, () => edit(view => { const head = view.state.selection.main.head; view.dispatch({ selection: { anchor: Math.min(view.state.doc.length, head + 1) }, scrollIntoView: true }); return true; }))}
    </div>
    <div className="code-workbench-editor" ref={host} />
    {error ? <p className="code-editor-error" role="alert">{error}</p> : null}
    <div className="code-workbench-status">
      <span>Ln {position.line}, Col {position.column}</span><span>Spaces: 4</span>
      <div>{tool("Decrease code font size", <ZoomOut size={16} />, () => setFontSize(value => Math.max(12, value - 1)), undefined, fontSize <= 12)}
        <span>{fontSize}px</span>{tool("Increase code font size", <ZoomIn size={16} />, () => setFontSize(value => Math.min(24, value + 1)), undefined, fontSize >= 24)}
        {props.allowClear !== false ? tool("Clear code", <Trash2 size={16} />, () => {
          if (window.confirm("Clear this code? You can undo this change in the editor.")) edit(view => { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "" }, userEvent: "delete" }); return true; });
        }) : null}
      </div>
    </div>
  </div>, portalHost)}</div>;
}

function editorAttributes(props: CodeEditorProps) {
  return { ...(props.id ? { id: props.id } : {}), "aria-label": props.label ?? "Source code", "aria-multiline": "true",
    spellcheck: "false", autocorrect: "off", autocapitalize: "off" };
}

function insertSpaces(view: EditorView) {
  if (view.state.readOnly) return false;
  view.dispatch(view.state.replaceSelection("    "), { scrollIntoView: true, userEvent: "input" });
  return true;
}
