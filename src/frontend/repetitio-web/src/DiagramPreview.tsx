import { Code2, Download, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { diagramPalette, renderDiagramSvg } from "./diagramRenderer";

export function DiagramPreview({ source, sourceElement }: { source: string; sourceElement: HTMLElement }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState("");
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    sourceElement.hidden = !showSource;
    return () => { sourceElement.hidden = false; };
  }, [showSource, sourceElement]);
  useEffect(() => {
    if (!window.IntersectionObserver) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "300px" });
    if (viewport.current) observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setTheme(`${root.dataset.style}/${root.dataset.theme}`);
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-style"] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setError(null);
    void Promise.resolve().then(() => renderDiagramSvg(source, diagramPalette())).then(result => {
      if (!cancelled) setSvg(result);
    }).catch(() => {
      if (!cancelled) { setError("Could not render this diagram. Check the Mermaid source."); setShowSource(true); setSvg(""); }
    });
    return () => { cancelled = true; };
  }, [source, visible, theme]);
  function download() {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url; link.download = "wiki-diagram.svg"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="wiki-diagram-player">
    <div className="wiki-diagram-controls">
      <button type="button" className="code-icon-button" title="Show Mermaid source" aria-label="Show Mermaid source" aria-pressed={showSource} onClick={() => setShowSource(value => !value)}><Code2 size={16} aria-hidden="true" /></button>
      <button type="button" className="code-icon-button" title="Zoom out" aria-label="Zoom out" disabled={zoom <= .5 || !svg} onClick={() => setZoom(value => Math.max(.5, value - .25))}><ZoomOut size={16} aria-hidden="true" /></button>
      <button type="button" className="code-icon-button" title="Reset diagram zoom" aria-label="Reset diagram zoom" disabled={!svg} onClick={() => setZoom(1)}><RotateCcw size={16} aria-hidden="true" /></button>
      <button type="button" className="code-icon-button" title="Zoom in" aria-label="Zoom in" disabled={zoom >= 3 || !svg} onClick={() => setZoom(value => Math.min(3, value + .25))}><ZoomIn size={16} aria-hidden="true" /></button>
      <button type="button" className="code-icon-button" title="Download diagram SVG" aria-label="Download diagram SVG" disabled={!svg} onClick={download}><Download size={16} aria-hidden="true" /></button>
    </div>
    <div className="wiki-diagram-viewport" ref={viewport} role="region" aria-label="Mermaid diagram" tabIndex={0}>
      {error ? <p className="diagram-error" role="status">{error}</p> : svg ?
        <div className="wiki-diagram-svg" style={{ width: `${zoom * 100}%` }} dangerouslySetInnerHTML={{ __html: svg }} /> :
        <p className="diagram-loading" role="status">Loading diagram...</p>}
    </div>
  </div>;
}
