import type { ImportWikiPageNodeRequest, WikiSourceRequest, WikiQuizQuestionRequest, WikiFlashcardRequest } from "./types";

interface WikiImportTable {
  headers?: string[];
  columns?: string[];
  rows?: Array<string[] | Record<string, unknown>>;
}

export function parseWikiBatchImport(contents: string): ImportWikiPageNodeRequest[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("Import file must contain valid JSON.");
  }

  const rawPages = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.pages)
      ? parsed.pages
      : null;

  if (!rawPages || rawPages.length === 0) {
    throw new Error("JSON must contain a non-empty pages array, or be a non-empty array of pages.");
  }

  return rawPages.map((page, index) => normalizeImportedWikiPage(page, `pages[${index}]`));
}

function normalizeImportedWikiPage(value: unknown, path: string): ImportWikiPageNodeRequest {
  if (!isRecord(value)) {
    throw new Error(`${path} must be a JSON object.`);
  }

  const title = readRequiredWikiString(value, "title", path);
  const leadParagraphs = readWikiStringArray(value.lead, `${path}.lead`);
  const rawContentMarkdown = readOptionalWikiString(value.contentMarkdown);
  const contentMarkdown = rawContentMarkdown || buildWikiArticleMarkdown(value, leadParagraphs);
  const children = Array.isArray(value.children)
    ? value.children.map((child, index) => normalizeImportedWikiPage(child, `${path}.children[${index}]`))
    : undefined;

  return {
    title,
    slug: readOptionalWikiString(value.slug) || undefined,
    summary: readOptionalWikiString(value.summary) || leadParagraphs[0] || undefined,
    contentMarkdown,
    sources: readWikiSources(value.sources ?? value.references, `${path}.sources`),
    quizQuestions: readWikiQuizQuestions(value.quizQuestions ?? value.quiz, `${path}.quizQuestions`),
    flashcards: readWikiFlashcards(value.flashcards, `${path}.flashcards`),
    children
  };
}

export function parseWikiSourcesJson(contents: string): WikiSourceRequest[] {
  const trimmed = contents.trim();

  if (!trimmed) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Sources JSON must be valid JSON.");
  }

  const rawSources = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.sources)
      ? parsed.sources
      : isRecord(parsed) && Array.isArray(parsed.references)
        ? parsed.references
        : null;

  if (!rawSources) {
    throw new Error("Sources JSON must be an array or an object with sources/references.");
  }

  return readWikiSources(rawSources, "sources");
}

export function parseWikiQuizJson(contents: string): WikiQuizQuestionRequest[] {
  const trimmed = contents.trim();

  if (!trimmed) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Quiz JSON must be valid JSON.");
  }

  const rawQuestions = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.quizQuestions)
      ? parsed.quizQuestions
      : isRecord(parsed) && Array.isArray(parsed.questions)
        ? parsed.questions
        : null;

  if (!rawQuestions) {
    throw new Error("Quiz JSON must be an array or an object with quizQuestions/questions.");
  }

  return readWikiQuizQuestions(rawQuestions, "quizQuestions");
}

export function parseWikiFlashcardJson(contents: string): WikiFlashcardRequest[] {
  const trimmed = contents.trim();

  if (!trimmed) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Flashcards JSON must be valid JSON.");
  }

  const rawFlashcards = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.flashcards)
      ? parsed.flashcards
      : null;

  if (!rawFlashcards) {
    throw new Error("Flashcards JSON must be an array or an object with flashcards.");
  }

  return readWikiFlashcards(rawFlashcards, "flashcards");
}

function readWikiSources(value: unknown, path: string): WikiSourceRequest[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array.`);
  }

  return value.map((source, index) => {
    if (!isRecord(source)) {
      throw new Error(`${path}[${index}] must be a JSON object.`);
    }

    return {
      title: readRequiredWikiString(source, "title", `${path}[${index}]`),
      type: readOptionalWikiString(source.type) || readOptionalWikiString(source.kind) || undefined,
      author: readOptionalWikiString(source.author) || readOptionalWikiString(source.authors) || undefined,
      url: readOptionalWikiString(source.url) || undefined,
      locator: readOptionalWikiString(source.locator)
        || readOptionalWikiString(source.location)
        || readOptionalWikiString(source.chapter)
        || undefined,
      notes: readOptionalWikiString(source.notes) || readOptionalWikiString(source.note) || undefined
    };
  });
}

function readWikiQuizQuestions(value: unknown, path: string): WikiQuizQuestionRequest[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array.`);
  }

  return value.map((question, index) => {
    if (!isRecord(question)) {
      throw new Error(`${path}[${index}] must be a JSON object.`);
    }

    const prompt = readRequiredWikiString(question, "prompt", `${path}[${index}]`);
    const rawOptions = question.options;

    if (!Array.isArray(rawOptions)) {
      throw new Error(`${path}[${index}].options must be an array.`);
    }

    const options = rawOptions.map((option, optionIndex) => {
      if (!isRecord(option)) {
        throw new Error(`${path}[${index}].options[${optionIndex}] must be a JSON object.`);
      }

      return {
        text: readRequiredWikiString(option, "text", `${path}[${index}].options[${optionIndex}]`),
        isCorrect: Boolean(option.isCorrect)
      };
    });

    return {
      prompt,
      explanation: readOptionalWikiString(question.explanation) || undefined,
      options
    };
  });
}

function readWikiFlashcards(value: unknown, path: string): WikiFlashcardRequest[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array.`);
  }

  return value.map((flashcard, index) => {
    if (!isRecord(flashcard)) {
      throw new Error(`${path}[${index}] must be a JSON object.`);
    }

    return {
      front: readRequiredWikiString(flashcard, "front", `${path}[${index}]`),
      back: readRequiredWikiString(flashcard, "back", `${path}[${index}]`)
    };
  });
}

function buildWikiArticleMarkdown(page: Record<string, unknown>, leadParagraphs: string[]) {
  const chunks: string[] = [];
  const infoboxMarkdown = renderWikiInfobox(page.infobox, "infobox");

  if (infoboxMarkdown) {
    chunks.push(infoboxMarkdown);
  }

  if (leadParagraphs.length > 0) {
    chunks.push(leadParagraphs.join("\n\n"));
  }

  chunks.push(...renderWikiContentBlocks(page, "page"));

  const sections = Array.isArray(page.sections) ? page.sections : [];
  sections.forEach((section, index) => {
    chunks.push(renderWikiSection(section, `sections[${index}]`, 2));
  });

  const seeAlso = readWikiStringArray(page.seeAlso, "seeAlso");
  if (seeAlso.length > 0) {
    chunks.push(["## See also", ...seeAlso.map((item) => `- ${item}`)].join("\n"));
  }

  const references = renderWikiLinks(page.references, "References");
  if (references) {
    chunks.push(references);
  }

  const externalLinks = renderWikiLinks(page.externalLinks, "External links");
  if (externalLinks) {
    chunks.push(externalLinks);
  }

  const categories = readWikiStringArray(page.categories, "categories");
  if (categories.length > 0) {
    chunks.push(["## Categories", ...categories.map((category) => `- ${category}`)].join("\n"));
  }

  return chunks.filter(Boolean).join("\n\n");
}

function renderWikiSection(value: unknown, path: string, fallbackLevel: number): string {
  if (!isRecord(value)) {
    throw new Error(`${path} must be a JSON object.`);
  }

  const heading = readOptionalWikiString(value.heading) || readOptionalWikiString(value.title);
  if (!heading) {
    throw new Error(`${path} must include heading or title.`);
  }

  const level = clampHeadingLevel(readOptionalWikiNumber(value.level) ?? fallbackLevel);
  const chunks = [`${"#".repeat(level)} ${heading}`];
  chunks.push(...renderWikiContentBlocks(value, path));

  const sections = Array.isArray(value.sections) ? value.sections : [];
  sections.forEach((section, index) => {
    chunks.push(renderWikiSection(section, `${path}.sections[${index}]`, Math.min(level + 1, 4)));
  });

  return chunks.filter(Boolean).join("\n\n");
}

function renderWikiContentBlocks(value: Record<string, unknown>, path: string) {
  const chunks: string[] = [];
  const text = readOptionalWikiString(value.text);
  const paragraphs = readWikiStringArray(value.paragraphs, `${path}.paragraphs`);
  const quote = readOptionalWikiString(value.quote);
  const bullets = renderWikiList(value.list ?? value.bullets, `${path}.list`);
  const steps = renderWikiList(value.steps ?? value.orderedList, `${path}.steps`, true);
  const table = renderWikiTable(value.table, `${path}.table`);
  const code = renderWikiCode(value.code, `${path}.code`);
  const blocks = Array.isArray(value.blocks) ? value.blocks : [];

  if (text) {
    chunks.push(text);
  }

  if (paragraphs.length > 0) {
    chunks.push(paragraphs.join("\n\n"));
  }

  if (quote) {
    chunks.push(`> ${quote}`);
  }

  if (bullets) {
    chunks.push(bullets);
  }

  if (steps) {
    chunks.push(steps);
  }

  if (table) {
    chunks.push(table);
  }

  if (code) {
    chunks.push(code);
  }

  if (value.definitions != null) chunks.push(renderWikiDefinitions(value.definitions, `${path}.definitions`));
  if (value.checklist != null) chunks.push(renderWikiChecklist(value.checklist, `${path}.checklist`));
  if (value.takeaways != null) chunks.push(wikiLearningContainer("takeaways", "Key takeaways", renderWikiList(value.takeaways, `${path}.takeaways`)));

  blocks.forEach((block, index) => {
    chunks.push(renderWikiBlock(block, `${path}.blocks[${index}]`));
  });

  return chunks.filter(Boolean);
}

function renderWikiBlock(value: unknown, path: string): string {
  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    throw new Error(`${path} must be a string or JSON object.`);
  }

  const type = readOptionalWikiString(value.type).toLowerCase();

  if (type === "heading" || type === "section") {
    return renderWikiSection(value, path, 2);
  }

  if (type === "quote") {
    const text = readRequiredWikiString(value, "text", path);
    return `> ${text}`;
  }

  if (type === "list") {
    return renderWikiList(value.items, `${path}.items`);
  }

  if (type === "steps" || type === "ordered-list") {
    return renderWikiList(value.items, `${path}.items`, true);
  }

  if (type === "table") {
    return renderWikiTable(value, path);
  }

  if (type === "code") {
    return renderWikiCode(value, path);
  }

  if (type === "image") {
    const id = readRequiredWikiString(value, "imageId", path);
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) throw new Error(`${path}.imageId must be an existing local image ID.`);
    const alt = readOptionalWikiString(value.alt).replace(/[\r\n]/g, " ").replace(/[\\[\]]/g, "\\$&");
    const caption = readOptionalWikiString(value.caption);
    return `![${alt}](wiki-image:${id})${caption ? "\n\n" + caption : ""}`;
  }

  if (type === "definitions") return renderWikiDefinitions(value.items, `${path}.items`);
  if (type === "checklist") return renderWikiChecklist(value.items, `${path}.items`);
  if (type === "takeaways") {
    return wikiLearningContainer("takeaways", readOptionalWikiString(value.title) || "Key takeaways", renderWikiList(value.items, `${path}.items`));
  }
  if (type === "recall") {
    const prompt = readRequiredWikiString(value, "prompt", path);
    const answer = readRequiredWikiString(value, "answer", path);
    const hint = readOptionalWikiString(value.hint);
    const body = [prompt,
      hint ? wikiLearningContainer("details", "Show hint", hint) : "",
      wikiLearningContainer("details", "Reveal answer", answer)].filter(Boolean).join("\n\n");
    return wikiLearningContainer("important", readOptionalWikiString(value.title) || "Active recall", body);
  }
  if (type === "callout" || type === "example" || type === "details") {
    const kind = type === "callout" ? readOptionalWikiString(value.kind) || "note" : type;
    if (!["note", "tip", "important", "warning", "pitfall", "example", "details"].includes(kind)) {
      throw new Error(`${path}.kind must be note, tip, important, warning, or pitfall.`);
    }
    const chunks: string[] = [];
    const input = readOptionalWikiString(value.input);
    const output = readOptionalWikiString(value.output);
    const explanation = readOptionalWikiString(value.explanation);
    if (input) chunks.push(`**Input:** ${input}`);
    chunks.push(...renderWikiContentBlocks(value, path));
    if (output) chunks.push(`**Output:** ${output}`);
    if (explanation) chunks.push(explanation);
    if (!chunks.length) throw new Error(`${path} must contain text, paragraphs, steps, code, or blocks.`);
    return wikiLearningContainer(kind, readOptionalWikiString(value.title) || (type === "example" ? "Worked example" : type === "details" ? "Show explanation" : "Note"), chunks.join("\n\n"));
  }

  return readRequiredWikiString(value, "text", path);
}

function renderWikiList(value: unknown, path: string, ordered = false, depth = 0): string {
  if (value == null || value === "") return "";
  if (depth > 20) throw new Error(`${path} is nested too deeply (maximum 20 levels).`);
  const items = typeof value === "string" ? [value] : value;
  if (!Array.isArray(items)) throw new Error(`${path} must be a string or an array of list items.`);
  const rendered = items.map((item, index) => {
    const itemPath = `${path}[${index}]`;
    const text = typeof item === "string" ? item.trim() : isRecord(item) ? readRequiredWikiString(item, "text", itemPath) : "";
    if (!text) {
      if (typeof item === "string") return "";
      throw new Error(`${itemPath} must be a string or an object with text and optional items.`);
    }
    const marker = ordered ? `${index + 1}. ` : "- ";
    const indent = " ".repeat(marker.length);
    const lines = text.split("\n");
    const result = marker + lines[0] + lines.slice(1).map(line => "\n" + indent + line).join("");
    const nested = isRecord(item) ? renderWikiList(item.items, `${itemPath}.items`, ordered, depth + 1) : "";
    return result + (nested ? "\n" + nested.split("\n").map(line => indent + line).join("\n") : "");
  });
  return rendered.filter(Boolean).join("\n");
}

function renderWikiDefinitions(value: unknown, path: string) {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array of term/definition objects.`);
  return value.map((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) throw new Error(`${itemPath} must be a term/definition object.`);
    return wikiLearningContainer("definition", readRequiredWikiString(item, "term", itemPath), readRequiredWikiString(item, "definition", itemPath));
  }).join("\n\n");
}

function renderWikiChecklist(value: unknown, path: string) {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array of strings or text/checked objects.`);
  const items = value.map((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (typeof item === "string") return `[ ] ${item}`;
    if (!isRecord(item)) throw new Error(`${itemPath} must be a string or an object.`);
    if (item.checked !== undefined && typeof item.checked !== "boolean") throw new Error(`${itemPath}.checked must be a boolean.`);
    return `[${item.checked ? "x" : " "}] ${readRequiredWikiString(item, "text", itemPath)}`;
  });
  return renderWikiList(items, path);
}

export function wikiLearningContainer(kind: string, title: string, body: string) {
  if (!body.trim()) return "";
  // A longer outer fence keeps nested hints and examples inside their parent block.
  const longestFence = body.split("\n").reduce((longest, line) => Math.max(longest, line.match(/^\s*(:{3,})/)?.[1].length ?? 0), 2);
  const fence = ":".repeat(longestFence + 1);
  return `${fence}${kind} ${title.replace(/\s+/g, " ")}\n\n${body}\n\n${fence}`;
}

function renderWikiInfobox(value: unknown, path: string) {
  if (!isRecord(value)) {
    return "";
  }

  const rows = Object.entries(value)
    .map(([key, rowValue]) => [key, readOptionalWikiString(rowValue)])
    .filter(([, rowValue]) => rowValue);

  if (rows.length === 0) {
    return "";
  }

  return renderWikiTable({ headers: ["Property", "Value"], rows }, path);
}

function renderWikiLinks(value: unknown, heading: string) {
  const links = Array.isArray(value) ? value : [];
  const lines = links.map((link, index) => {
    if (typeof link === "string") {
      return `- ${link.trim()}`;
    }

    if (!isRecord(link)) {
      throw new Error(`${heading}[${index}] must be a string or JSON object.`);
    }

    const label = readRequiredWikiString(link, "label", `${heading}[${index}]`);
    const url = readOptionalWikiString(link.url);
    return url ? `- [${label}](${url})` : `- ${label}`;
  });

  return lines.length > 0 ? [`## ${heading}`, ...lines].join("\n") : "";
}

function renderWikiTable(value: unknown, path: string): string {
  if (!isRecord(value)) {
    return "";
  }

  const table = value as WikiImportTable;
  const headers = readWikiStringArray(table.headers ?? table.columns, `${path}.headers`);
  const rows = Array.isArray(table.rows) ? table.rows : [];

  if (headers.length === 0 || rows.length === 0) {
    return "";
  }

  const normalizedRows = rows.map((row, rowIndex) => {
    if (Array.isArray(row)) {
      return headers.map((_, cellIndex) => sanitizeWikiTableCell(readOptionalWikiString(row[cellIndex])));
    }

    if (isRecord(row)) {
      return headers.map((header) => sanitizeWikiTableCell(readOptionalWikiString(row[header])));
    }

    throw new Error(`${path}.rows[${rowIndex}] must be an array or JSON object.`);
  });

  return [
    `| ${headers.map(sanitizeWikiTableCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...normalizedRows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function renderWikiCode(value: unknown, path: string) {
  if (typeof value === "string") {
    return wikiCodeFence(value);
  }

  if (!isRecord(value)) {
    return "";
  }

  const content = readRequiredWikiString(value, "content", path);
  const language = readOptionalWikiString(value.language);
  return wikiCodeFence(content, language);
}

function wikiCodeFence(content: string, language = "") {
  const length = (content.match(/`{3,}/g) ?? []).reduce((longest, run) => Math.max(longest, run.length + 1), 3);
  const fence = "`".repeat(length);
  return `${fence}${language.replace(/\s+/g, " ")}\n${content}\n${fence}`;
}

function readRequiredWikiString(value: Record<string, unknown>, field: string, path: string) {
  const fieldValue = readOptionalWikiString(value[field]);

  if (!fieldValue) {
    throw new Error(`${path}.${field} is required.`);
  }

  return fieldValue;
}

function readOptionalWikiString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalWikiNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readWikiStringArray(value: unknown, path: string) {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${path} must be a string or an array of strings.`);
  }

  return value.map((item, index) => {
    if (typeof item !== "string") {
      throw new Error(`${path}[${index}] must be a string.`);
    }

    return item.trim();
  }).filter(Boolean);
}

function sanitizeWikiTableCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

function clampHeadingLevel(value: number) {
  return Math.min(4, Math.max(2, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
