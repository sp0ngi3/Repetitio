import MarkdownIt from "markdown-it";
import container from "markdown-it-container";
import { getWikiImageUrl } from "./api";
import { codeLanguageLabel, highlightCode, normalizeCodeLanguage } from "./codeHighlight";
import { WikiMarkdownContent } from "./WikiMarkdownContent";

export interface MarkdownHeading {
  id: string;
  level: number;
  text: string;
}

const markdown = new MarkdownIt({ html: false, linkify: false, typographer: false });
const names = ["note", "tip", "important", "warning", "pitfall", "example", "takeaways", "details", "definition"];

for (const name of names) {
  const render: NonNullable<typeof markdown.renderer.rules.fence> = (tokens, index, _options, env) => {
      const opening = tokens[index].nesting === 1;
      if (!opening) return name === "details" ? "</details>\n" : name === "definition" ? "</dd></dl>\n" : "</aside>\n";
      const title = tokens[index].info.trim().slice(name.length).trim() || name;
      const label = markdown.renderInline(title);
      const attributes = markdown.renderer.renderAttrs(tokens[index]);
      if (name === "details") return `<details class="wiki-reveal"${attributes}${env?.expandDetails ? " open" : ""}><summary>${label}</summary>\n`;
      if (name === "definition") return `<dl class="wiki-definition"${attributes}><dt>${label}</dt><dd>\n`;
      return `<aside class="wiki-learning-block wiki-learning-${name}" role="note"${attributes}><strong class="wiki-learning-label">${label}</strong>\n`;
  };
  markdown.use(container, name, { render });
}

const imageRule = markdown.renderer.rules.image!;
markdown.renderer.rules.image = (tokens, index, options, env, renderer) => {
  const token = tokens[index];
  const source = String(token.attrGet("src") ?? "");
  const local = source.match(/^wiki-image:([0-9a-fA-F-]{36})$/);
  if (local) token.attrSet("src", getWikiImageUrl(local[1]));
  token.attrJoin("class", "wiki-content-image");
  return imageRule(tokens, index, options, env, renderer);
};
const linkRule = markdown.renderer.rules.link_open;
markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  if (!String(tokens[index].attrGet("href") ?? "").startsWith("#")) {
    tokens[index].attrSet("target", "_blank");
    tokens[index].attrSet("rel", "noopener noreferrer");
  }
  return linkRule ? linkRule(tokens, index, options, env, renderer) : renderer.renderToken(tokens, index, options);
};
markdown.renderer.rules.table_open = (tokens, index) => {
  const token = tokens[index];
  const attributes = markdown.renderer.renderAttrs(token);
  return `<div class="wiki-table-wrap"${sourceAttributes(token.map)}>
    <div class="wiki-table-toolbar"><span>${token.meta?.columns ?? 0} columns</span><span class="wiki-table-actions"></span></div>
    <div class="wiki-table-viewport" role="region" aria-label="Scrollable table" tabindex="0"><table${attributes}>\n`;
};
markdown.renderer.rules.table_close = () => '</table></div></div>\n';
markdown.renderer.rules.fence = (tokens, index) => {
  const language = tokens[index].info.trim().split(/\s+/)[0];
  const source = tokens[index].content;
  const diagram = normalizeCodeLanguage(language) === "mermaid";
  return `<section class="wiki-code-block${diagram ? " wiki-diagram-block" : ""}"${sourceAttributes(tokens[index].map)}>
    <div class="wiki-code-toolbar"><span class="wiki-code-language">${markdown.utils.escapeHtml(codeLanguageLabel(language))}</span><span class="wiki-code-actions"></span></div>
    ${diagram ? '<div class="wiki-diagram-preview"></div>' : ""}
    <pre><code class="syntax-highlight language-${markdown.utils.escapeHtml(normalizeCodeLanguage(language))}">${highlightCode(source, language)}</code></pre>
  </section>\n`;
};
// Add only generated checkbox HTML; arbitrary user HTML remains disabled.
markdown.core.ruler.after("inline", "wiki_checklists", state => {
  const headings: string[] = [];
  const occurrences = new Map<string, number>();
  state.tokens.forEach((token, index) => {
    if (token.type === "heading_open") {
      headings.length = Number(token.tag.slice(1));
      headings[headings.length - 1] = state.tokens[index + 1]?.content ?? "";
    }
    if (token.type !== "inline" || state.tokens[index - 2]?.type !== "list_item_open") return;
    const first = token.children?.[0];
    const match = first?.type === "text" ? first.content.match(/^\[([ xX])]\s+/) : null;
    if (!first || !match) return;
    first.content = first.content.slice(match[0].length);
    const label = token.content.slice(match[0].length);
    const identity = JSON.stringify([headings, label]);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    const checkbox = new state.Token("html_inline", "", 0);
    checkbox.content = `<input type="checkbox"${state.env?.interactiveChecklists ? "" : " disabled"}${match[1] !== " " ? " checked" : ""} data-checklist-key="${markdown.utils.escapeHtml(JSON.stringify([identity, occurrence]))}" /> `;
    const open = new state.Token("html_inline", "", 0);
    open.content = '<label class="wiki-checklist-item">';
    const close = new state.Token("html_inline", "", 0);
    close.content = "</span></label>";
    const textOpen = new state.Token("html_inline", "", 0);
    textOpen.content = '<span class="wiki-checklist-text">';
    token.children!.unshift(open, checkbox, textOpen);
    token.children!.push(close);
  });
});

export function renderWikiMarkdownHtml(source: string, expandDetails = false, interactiveChecklists = false) {
  const env = { expandDetails, interactiveChecklists };
  const tokens = markdown.parse(source, env);
  tokens.forEach((token, index) => {
    if (token.block && token.map && token.nesting !== -1) {
      token.attrSet("data-source-start", String(token.map[0]));
      token.attrSet("data-source-end", String(token.map[1]));
    }
    if (token.type !== "table_open") return;
    const cells: { token: typeof token; column: number }[] = [];
    const widths: number[] = [];
    let column = 0;
    for (let i = index + 1; i < tokens.length && tokens[i].type !== "table_close"; i++) {
      if (tokens[i].type === "tr_open") column = 0;
      if (tokens[i].type !== "th_open" && tokens[i].type !== "td_open") continue;
      const content = tokens[i + 1]?.content ?? "";
      const longestWord = content.split(/\s+/).reduce((longest, word) => Math.max(longest, word.length), 0);
      const minimum = content.length > 180 ? 300 : content.length > 80 ? 240 : content.length > 35 ? 180 : 120;
      widths[column] = Math.max(widths[column] ?? 0, Math.min(300, Math.max(minimum, longestWord * 8 + 24)));
      cells.push({ token: tokens[i], column: column++ });
    }
    token.meta = { ...token.meta, columns: widths.length };
    token.attrJoin("style", `--wiki-table-min-width:${widths.reduce((sum, width) => sum + width, 0)}px;`);
    cells.forEach(cell => cell.token.attrSet("style", `${cell.token.attrGet("style") ?? ""};--wiki-column-min:${widths[cell.column]}px;`));
  });
  const headings: MarkdownHeading[] = [];
  tokens.forEach((token, index) => {
    if (token.type !== "heading_open") return;
    const level = Number(token.tag.slice(1));
    const text = tokens[index + 1]?.content ?? "";
    const id = headingId(text, headings.length);
    headings.push({ id, level, text });
    token.attrSet("id", id);
    // Retain the article's existing heading scale below its page title.
    token.tag = `h${Math.min(6, Math.max(2, level + 1))}`;
    tokens[index + 2].tag = token.tag;
  });
  return { html: markdown.renderer.render(tokens, markdown.options, env), headings };
}

function sourceAttributes(map: [number, number] | null) {
  return map ? ` data-source-start="${map[0]}" data-source-end="${map[1]}"` : "";
}

export function renderWikiMarkdown(source: string, checklistScope?: string, interactive = true) {
  const result = renderWikiMarkdownHtml(source);
  return { nodes: source.trim() ? [<WikiMarkdownContent key={checklistScope ?? "markdown"} source={source} checklistScope={checklistScope} interactive={interactive} />] : [], headings: result.headings };
}

function headingId(text: string, index: number) {
  const slug = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return `${slug || "section"}-${index}`;
}
