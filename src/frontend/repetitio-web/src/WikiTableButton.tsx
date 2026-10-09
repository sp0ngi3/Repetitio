import { Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function WikiTableButton({ table }: { table: HTMLTableElement }) {
  const [expanded, setExpanded] = useState(false);
  return <>
    <button type="button" className="wiki-table-icon" aria-label="Expand table" title="Expand table" onClick={() => setExpanded(true)}><Maximize2 size={16} aria-hidden="true" /></button>
    {expanded ? createPortal(<ExpandedTable html={table.outerHTML} onClose={() => setExpanded(false)} />, document.body) : null}
  </>;
}

function ExpandedTable({ html, onClose }: { html: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="wiki-table-dialog" aria-label="Expanded table" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    <header><h2>Table</h2><button autoFocus type="button" className="wiki-table-icon" title="Close table" aria-label="Close table" onClick={() => dialog.current?.close()}><X size={18} aria-hidden="true" /></button></header>
    <div className="official-wiki-content wiki-table-dialog-scroll" tabIndex={0} role="region" aria-label="Expanded table contents" dangerouslySetInnerHTML={{ __html: html }} />
  </dialog>;
}
