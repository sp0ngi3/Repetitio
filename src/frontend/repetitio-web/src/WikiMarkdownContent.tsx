import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CopyCodeButton } from "./CopyCodeButton";
import { DiagramPreview } from "./DiagramPreview";
import { renderWikiMarkdownHtml } from "./wikiMarkdown";
import { WikiTableButton } from "./WikiTableButton";

interface CodeSlot { code: string; actions: HTMLElement; diagram: HTMLElement | null; source: HTMLElement | null; }

// Keep generated DOM stable while portal controls update, including browser-owned checkbox state.
const MarkdownHtml = memo(function MarkdownHtml({ html, root }: { html: string; root: RefObject<HTMLDivElement | null> }) {
  return <div ref={root} dangerouslySetInnerHTML={{ __html: html }} />;
});

export function WikiMarkdownContent({ source, checklistScope, interactive = true }: {
  source: string; checklistScope?: string; interactive?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const html = useMemo(() => renderWikiMarkdownHtml(source, false, interactive).html, [source, interactive]);
  const [slots, setSlots] = useState<CodeSlot[]>([]);
  const [tables, setTables] = useState<{ table: HTMLTableElement; actions: HTMLElement }[]>([]);
  const storageKey = checklistScope ? `repetitio-wiki-checklists:${checklistScope}` : null;
  useEffect(() => {
    setTables(Array.from(root.current?.querySelectorAll<HTMLElement>(".wiki-table-wrap") ?? []).flatMap(block => {
      const table = block.querySelector("table"), actions = block.querySelector<HTMLElement>(".wiki-table-actions");
      return table && actions ? [{ table, actions }] : [];
    }));
    setSlots(Array.from(root.current?.querySelectorAll<HTMLElement>(".wiki-code-block") ?? []).flatMap(block => {
      const actions = block.querySelector<HTMLElement>(".wiki-code-actions");
      return actions ? [{ code: block.querySelector("code")?.textContent ?? "", actions,
        diagram: block.querySelector<HTMLElement>(".wiki-diagram-preview"), source: block.querySelector<HTMLElement>("pre") }] : [];
    }));
    for (const box of root.current?.querySelectorAll<HTMLInputElement>("input[data-checklist-key]") ?? []) box.checked = box.defaultChecked;
    if (!storageKey) return;
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) return;
      for (const box of root.current?.querySelectorAll<HTMLInputElement>("input[data-checklist-key]") ?? []) {
        const checked = (saved as Record<string, unknown>)[box.dataset.checklistKey!];
        if (typeof checked === "boolean") box.checked = checked;
      }
    } catch { /* Checklist interactions still work when local storage is unavailable. */ }
  }, [html, storageKey]);
  useEffect(() => {
    const element = root.current;
    if (!element || !storageKey) return;
    function saveChecklist() {
      const values: Record<string, boolean> = {};
      for (const box of element!.querySelectorAll<HTMLInputElement>("input[data-checklist-key]")) values[box.dataset.checklistKey!] = box.checked;
      try { localStorage.setItem(storageKey!, JSON.stringify(values)); } catch { /* Keep the checked state for this visit. */ }
    }
    element.addEventListener("change", saveChecklist);
    return () => element.removeEventListener("change", saveChecklist);
  }, [storageKey]);
  return <>
    <MarkdownHtml root={root} html={html} />
    {tables.map((table, index) => createPortal(<WikiTableButton table={table.table} />, table.actions, `table-${index}`))}
    {slots.map((slot, index) => <span key={index}>
      {createPortal(<CopyCodeButton source={slot.code} />, slot.actions)}
      {slot.diagram && slot.source ? createPortal(<DiagramPreview source={slot.code} sourceElement={slot.source} />, slot.diagram) : null}
    </span>)}
  </>;
}
