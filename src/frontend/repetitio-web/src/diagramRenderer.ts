import DOMPurify from "dompurify";

export interface DiagramPalette {
  surface: string;
  text: string;
  accent: string;
  border: string;
  font: string;
}

let sequence = 0;
let renderQueue: Promise<unknown> = Promise.resolve();

export function diagramPalette(print = false): DiagramPalette {
  const style = getComputedStyle(document.documentElement);
  return print ? { surface: "#ffffff", text: "#202122", accent: "#305eab", border: "#a2a9b1", font: "Arial, sans-serif" } : {
    surface: style.getPropertyValue("--surface").trim(), text: style.getPropertyValue("--text").trim(),
    accent: style.getPropertyValue("--accent").trim(), border: style.getPropertyValue("--border-strong").trim(),
    font: style.getPropertyValue("--font-ui").trim()
  };
}

export function validateDiagramSource(source: string) {
  if (source.length > 40_000) throw new Error("This diagram is too large. Split it into smaller diagrams.");
  if (/%%\s*\{|^\s*---|https?:|data:|javascript:|url\s*\(|@import|<\s*(script|iframe|img|image|foreignObject)\b/i.test(source))
    throw new Error("Use a plain Mermaid diagram without configuration directives, HTML or external resources.");
}

export function renderDiagramSvg(source: string, palette: DiagramPalette) {
  validateDiagramSource(source);
  // Mermaid configuration is global; serialize renders so concurrent themes cannot leak into each other.
  const work = renderQueue.then(async () => {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true,
      maxTextSize: 40_000, maxEdges: 400, theme: "base", htmlLabels: false,
      flowchart: { htmlLabels: false },
      themeVariables: { background: palette.surface, primaryColor: palette.surface, primaryTextColor: palette.text,
        primaryBorderColor: palette.accent, lineColor: palette.text, secondaryColor: palette.surface,
        tertiaryColor: palette.surface, textColor: palette.text, nodeTextColor: palette.text,
        actorTextColor: palette.text, actorBkg: palette.surface, actorBorder: palette.accent,
        signalColor: palette.text, signalTextColor: palette.text, labelTextColor: palette.text,
        labelBoxBkgColor: palette.surface, labelBoxBorderColor: palette.border,
        noteBkgColor: palette.surface, noteTextColor: palette.text, noteBorderColor: palette.border,
        edgeLabelBackground: palette.surface, fontFamily: palette.font, fontSize: "16px" }
    });
    const host = document.createElement("div");
    host.className = "diagram-render-host";
    host.style.cssText = "position:fixed;left:-10000px;top:0;width:1200px;visibility:hidden;pointer-events:none";
    document.body.append(host);
    try {
      const { svg } = await mermaid.render(`repetitio-diagram-${++sequence}`, source, host);
      return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ["foreignObject", "script", "iframe", "image", "a"] });
    } finally { host.remove(); }
  });
  renderQueue = work.catch(() => undefined);
  return work;
}

export async function renderPrintableDiagrams(target: Document) {
  for (const container of target.querySelectorAll<HTMLElement>(".wiki-diagram-block")) {
    const source = container.querySelector("code")?.textContent ?? "";
    try {
      const svg = await renderDiagramSvg(source, diagramPalette(true));
      const preview = container.querySelector<HTMLElement>(".wiki-diagram-preview");
      if (preview) preview.innerHTML = svg;
    } catch { /* Keep the original source visible in the PDF when a diagram is invalid. */ }
  }
}
