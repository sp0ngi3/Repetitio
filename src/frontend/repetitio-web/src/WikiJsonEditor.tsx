import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, FileJson, Eye, Save, RefreshCw } from "lucide-react";
import { getWikiJson, updateWikiJson } from "./api";
import { CodeEditor } from "./CodeEditor";
import type { WikiJsonDocument } from "./types";
import { flattenWikiJson, planWikiJsonEdit } from "./wikiJsonEditing";
import { renderWikiMarkdown } from "./wikiMarkdown";

export function WikiJsonEditor({ pageId, onSaved, onCancel }: {
  pageId: string; onSaved: (id: string) => Promise<void>; onCancel: () => void;
}) {
  const [baseline, setBaseline] = useState<WikiJsonDocument | null>(null);
  const [source, setSource] = useState("");
  const [includeChildren, setIncludeChildren] = useState(false);
  const [plan, setPlan] = useState<ReturnType<typeof planWikiJsonEdit> | null>(null);
  const [previewId, setPreviewId] = useState(pageId);
  const [allowImages, setAllowImages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const requestId = useRef(0);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(children: boolean) {
    const version = ++requestId.current;
    const previousScope = includeChildren;
    setIncludeChildren(children); setLoading(true); setError(null);
    try {
      const document = await getWikiJson(pageId, children);
      if (!active.current || version !== requestId.current) return;
      setBaseline(document); setSource(JSON.stringify(document, null, 2)); setIncludeChildren(children);
      setPlan(null); setAllowImages(false); setPreviewId(pageId);
    } catch (failure) {
      if (active.current && version === requestId.current) {
        setIncludeChildren(previousScope);
        setError(failure instanceof Error ? failure.message : "Unable to load JSON.");
      }
    } finally { if (active.current && version === requestId.current) setLoading(false); }
  }
  useEffect(() => {
    active.current = true;
    void load(false);
    return () => { active.current = false; requestId.current++; if (copiedTimer.current) clearTimeout(copiedTimer.current); };
  }, [pageId]);
  useEffect(() => {
    if (!baseline || source === JSON.stringify(baseline, null, 2)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [source, baseline]);

  function change(value: string) { setSource(value); setPlan(null); setCopied(false); setAllowImages(false); }
  function confirmDiscard() {
    return !baseline || source === JSON.stringify(baseline, null, 2) || window.confirm("Discard the JSON changes that have not been saved?");
  }
  function review() {
    if (!baseline) return;
    try { const next = planWikiJsonEdit(source, baseline); setPlan(next); setError(null); setPreviewId(next.updates[0].id); }
    catch (failure) { setPlan(null); setError(failure instanceof Error ? failure.message : "Invalid JSON."); }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(source); setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch { setError("Unable to copy JSON. Select the source text or download the file instead."); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([source], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${baseline?.pages[0]?.slug ?? "wiki"}-edit.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function save() {
    if (!plan || busy || plan.missingImages && !allowImages) return;
    const removals = plan.summaries.some(item => item.removedChecks || item.removedSources || item.clearedContent || item.missingImages);
    if (removals && !window.confirm("Save these JSON changes? Removed checks, sources and article content will be replaced. Unlinked image files remain stored. Pages omitted from this JSON will not be deleted.")) return;
    setBusy(true); setError(null);
    try {
      await updateWikiJson(pageId, { updates: plan.updates, allowImageRemoval: allowImages });
      window.dispatchEvent(new Event("wiki-study-updated"));
      await onSaved(pageId);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to save JSON. Your text has been retained."); }
    finally { if (active.current) setBusy(false); }
  }
  const preview = plan?.updates.find(update => update.id === previewId);
  const changed = plan?.summaries.filter(item => item.changed).length ?? 0;
  return <main className="wiki-document wiki-json-editor" aria-label="Wiki JSON editor">
    <header className="wiki-special-header">
      <div><span>Article tools</span><h1>Edit JSON</h1></div>
      <div className="wiki-json-actions">
        <button className="secondary-button wiki-icon-button" type="button" title="Reload JSON" aria-label="Reload JSON" disabled={loading || busy} onClick={() => { if (confirmDiscard()) void load(includeChildren); }}><RefreshCw size={18} /></button>
        <button className="secondary-button wiki-icon-button" type="button" title="Download JSON" aria-label="Download JSON" disabled={!baseline || loading || busy} onClick={download}><Download size={18} /></button>
        <button className="secondary-button" type="button" disabled={!baseline || loading || busy} onClick={review}><Eye size={16} /> Review changes</button>
        <button className="primary-button" type="button" disabled={!plan || !changed || busy || !!plan.missingImages && !allowImages} onClick={() => void save()}><Save size={16} />{busy ? "Saving..." : "Save changes"}</button>
        <button className="secondary-button" type="button" disabled={busy} onClick={() => { if (confirmDiscard()) onCancel(); }}>Cancel</button>
      </div>
    </header>
    {error ? <p className="error-banner" role="alert">{error}</p> : null}
    <div className="wiki-json-scope">
      <strong>{baseline?.pages[0]?.title ?? "Article"}</strong>
      <label className="inline-checkbox"><input type="checkbox" checked={includeChildren} disabled={loading || busy}
        onChange={event => { if (confirmDiscard()) void load(event.target.checked); }} />Include subpages</label>
      {baseline ? <span>{flattenWikiJson(baseline).length} pages · {flattenWikiJson(baseline).reduce((sum, page) => sum + page.images.reduce((count, image) => count + image.occurrences, 0), 0)} image references</span> : null}
    </div>
    {loading ? <p role="status">Loading article JSON...</p> : baseline ? <>
      <div className="wiki-json-workspace">
        <section aria-label="Editable article JSON">
          <CodeEditor language="JSON" label="Article JSON" value={source} onChange={change} allowClear={false} disabled={busy}
            onFormat={() => { try { change(JSON.stringify(JSON.parse(source), null, 2)); setError(null); } catch { setError("JSON must be valid before formatting."); } }}
            copyAction={<button className="secondary-button wiki-icon-button" type="button" disabled={busy} title={copied ? "JSON copied" : "Copy JSON"} aria-label={copied ? "JSON copied" : "Copy JSON"} onClick={() => void copy()}>{copied ? <Check size={18} /> : <Copy size={18} />}</button>} />
        </section>
        <section className="wiki-json-preview" aria-label="JSON change preview">
          {plan ? <>
            <div className="wiki-json-review-summary"><strong>{changed} pages changed</strong><span>{plan.untouchedPages} omitted pages kept</span>
              {plan.missingImages ? <label className="inline-checkbox"><input type="checkbox" checked={allowImages} onChange={event => setAllowImages(event.target.checked)} />Allow unlinking {plan.missingImages} image references</label> : null}
            </div>
            <label>Preview page<select value={previewId} onChange={event => setPreviewId(event.target.value)}>
              {plan.summaries.map(item => <option key={item.id} value={item.id}>{item.path}{item.changed ? " · changed" : " · unchanged"}</option>)}
            </select></label>
            {preview ? <>
              <h2>{preview.page.title}</h2>
              <div className="wiki-json-counts"><span>{preview.page.quizQuestions?.length ?? 0} quiz questions</span><span>{preview.page.flashcards?.length ?? 0} flashcards</span><span>{preview.page.sources?.length ?? 0} sources</span></div>
              {plan.summaries.filter(item => item.id === preview.id && (item.removedChecks || item.removedSources || item.clearedContent || item.missingImages)).map(item => <p className="wiki-review-due" key={item.id}>
                {item.removedChecks} checks removed · {item.removedSources} sources removed · {item.missingImages} images unlinked{item.clearedContent ? " · Article cleared" : ""}
              </p>)}
              <div className="official-wiki-content">{renderWikiMarkdown(preview.page.contentMarkdown ?? "").nodes}</div>
            </> : null}
          </> : <div className="wiki-json-preview-idle"><FileJson size={32} /><h2>Change preview</h2><button className="secondary-button" type="button" onClick={review}><Eye size={16} />Review changes</button></div>}
        </section>
      </div>
    </> : !loading ? <button className="secondary-button" type="button" onClick={() => void load(includeChildren)}>Retry loading JSON</button> : null}
  </main>;
}
