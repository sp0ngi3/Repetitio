import katex from "katex";
import katexCss from "katex/dist/katex.min.css?inline";
import mathCss from "./math.css?inline";

export const printableMathStyles = katexCss + "\n" + mathCss;

export function normalizeMathSource(source: string) {
  let result = source.replace(/\\_(?=\{)/g, "_");
  // Some copied articles lose one slash from aligned row separators. Repair only clear assignments.
  result = result.replace(/(\\begin\{aligned\})([\s\S]*?)(\\end\{aligned\})/g, (_match, start: string, body: string, end: string) =>
    start + body.replace(/(?<!\\)\\\s+(?=[A-Za-z](?:_\{?\w+\}?)?\s*&?=)/g, "\\\\ ") + end);
  return result;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function renderMathHtml(source: string, displayMode: boolean) {
  try {
    return katex.renderToString(normalizeMathSource(source), {
      displayMode, output: "htmlAndMathml", throwOnError: true, trust: false, strict: "ignore", maxSize: 20, maxExpand: 1000
    });
  } catch {
    return `<span class="wiki-math-error" title="This expression could not be rendered. The original source is preserved."><code>${escapeHtml(source)}</code></span>`;
  }
}
