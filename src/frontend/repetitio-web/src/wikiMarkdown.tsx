import MarkdownIt from "markdown-it";
import container from "markdown-it-container";
import { getWikiImageUrl } from "./api";

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
      if (name === "details") return `<details class="wiki-reveal"${env?.expandDetails ? " open" : ""}><summary>${label}</summary>\n`;
      if (name === "definition") return `<dl class="wiki-definition"><dt>${label}</dt><dd>\n`;
      return `<aside class="wiki-learning-block wiki-learning-${name}" role="note"><strong class="wiki-learning-label">${label}</strong>\n`;
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
markdown.renderer.rules.table_open = () => '<div class="wiki-table-wrap"><table>\n';
markdown.renderer.rules.table_close = () => '</table></div>\n';
const fenceRule = markdown.renderer.rules.fence!;
markdown.renderer.rules.fence = (tokens, index, options, env, renderer) => {
  const language = tokens[index].info.trim().split(/\s+/)[0];
  const label = language ? `<span>${markdown.utils.escapeHtml(language)}</span>` : "";
  return fenceRule(tokens, index, options, env, renderer).replace("<pre>", `<pre class="wiki-code-block">${label}`);
};
// Add only generated checkbox HTML; arbitrary user HTML remains disabled.
markdown.core.ruler.after("inline", "wiki_checklists", state => {
  state.tokens.forEach((token, index) => {
    if (token.type !== "inline" || state.tokens[index - 2]?.type !== "list_item_open") return;
    const first = token.children?.[0];
    const match = first?.type === "text" ? first.content.match(/^\[([ xX])]\s+/) : null;
    if (!first || !match) return;
    first.content = first.content.slice(match[0].length);
    const checkbox = new state.Token("html_inline", "", 0);
    checkbox.content = `<input type="checkbox" disabled${match[1] !== " " ? " checked" : ""} aria-label="Checklist item" /> `;
    token.children!.unshift(checkbox);
  });
});

export function renderWikiMarkdownHtml(source: string, expandDetails = false) {
  const env = { expandDetails };
  const tokens = markdown.parse(source, env);
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

export function renderWikiMarkdown(source: string) {
  const result = renderWikiMarkdownHtml(source);
  return { nodes: source.trim() ? [<div key="markdown" dangerouslySetInnerHTML={{ __html: result.html }} />] : [], headings: result.headings };
}

function headingId(text: string, index: number) {
  const slug = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return `${slug || "section"}-${index}`;
}
