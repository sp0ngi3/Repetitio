import { parseWikiBatchImport } from "./wikiImport";
import type { WikiJsonDocument, WikiJsonPage, WikiJsonPageUpdate } from "./types";

export function flattenWikiJson(document: WikiJsonDocument): WikiJsonPage[] {
  return document.pages.flatMap(page => [page, ...flattenWikiJson({ pages: page.children ?? [] })]);
}

export function wikiImageCounts(content: string) {
  const counts = new Map<string, number>();
  const expression = /(?:wiki-image:|\/api\/wiki\/images\/)([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/g;
  for (const match of content.matchAll(expression)) {
    const id = match[1].toLowerCase();
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function planWikiJsonEdit(source: string, baseline: WikiJsonDocument) {
  const parsed: unknown = JSON.parse(source);
  const rawPages = Array.isArray(parsed) ? parsed : record(parsed) ? parsed.pages : undefined;
  if (!Array.isArray(rawPages) || rawPages.length !== 1) throw new Error("Keep exactly one root page in pages; its children can be edited underneath it.");
  const originals = flattenWikiJson(baseline);
  const byId = new Map(originals.map(page => [page.id, page]));
  const seen = new Set<string>();
  const updates: WikiJsonPageUpdate[] = [];
  const summaries: { id: string; title: string; path: string; changed: boolean; missingImages: number; removedChecks: number; removedSources: number; clearedContent: boolean }[] = [];

  function visit(raw: unknown, parentId?: string) {
    if (!record(raw) || typeof raw.id !== "string" || seen.has(raw.id)) throw new Error("Every page needs its original, unique id. Use batch import to create new pages.");
    const original = byId.get(raw.id);
    if (!original) throw new Error("This JSON contains a page outside the selected export. Keep the original IDs.");
    if (parentId === undefined && original.id !== baseline.pages[0]?.id || parentId !== undefined && original.parentId !== parentId)
      throw new Error("Keep the original root and child hierarchy. Use article details to move a page.");
    if (raw.updatedAt !== original.updatedAt) throw new Error(`Keep updatedAt unchanged for '${original.title}'. Reload the JSON if it is from an older export.`);
    if (Object.hasOwn(raw, "parentId") && raw.parentId !== original.parentId) throw new Error("parentId is read-only in JSON editing.");
    if (Object.hasOwn(raw, "isArchived") && typeof raw.isArchived !== "boolean") throw new Error("isArchived must be a boolean.");
    if (Object.hasOwn(raw, "sortOrder") && (typeof raw.sortOrder !== "number" || !Number.isInteger(raw.sortOrder) || raw.sortOrder < 0 || raw.sortOrder > 100000))
      throw new Error("sortOrder must be an integer between 0 and 100000.");
    seen.add(raw.id);
    const candidate: Record<string, unknown> = { ...original, ...raw, children: [] };
    const structured = ["lead", "infobox", "sections", "blocks", "definitions", "checklist", "takeaways"].some(key => Object.hasOwn(raw, key));
    if (structured) {
      if (typeof raw.contentMarkdown === "string" && raw.contentMarkdown.trim())
        throw new Error("Choose contentMarkdown or structured sections, not both. To add sections to existing text, use appendSections.");
      delete candidate.contentMarkdown;
    }
    if (Object.hasOwn(raw, "quiz") && !Object.hasOwn(raw, "quizQuestions")) candidate.quizQuestions = raw.quiz;
    const normalized = parseWikiBatchImport(JSON.stringify({ pages: [candidate] }))[0];
    let contentMarkdown = normalized.contentMarkdown ?? "";
    if (Object.hasOwn(raw, "appendSections")) {
      if (!Array.isArray(raw.appendSections)) throw new Error("appendSections must be an array of sections.");
      const appended = parseWikiBatchImport(JSON.stringify({ pages: [{ title: normalized.title, sections: raw.appendSections }] }))[0].contentMarkdown;
      if (appended) contentMarkdown = [contentMarkdown, appended].filter(Boolean).join("\n\n");
    }
    const update: WikiJsonPageUpdate = { id: original.id, expectedUpdatedAt: original.updatedAt, page: {
      parentId: original.parentId, title: normalized.title, slug: normalized.slug ?? original.slug,
      summary: normalized.summary ?? undefined, contentMarkdown, sources: normalized.sources ?? [],
      quizQuestions: normalized.quizQuestions ?? [], flashcards: normalized.flashcards ?? [],
      isArchived: typeof raw.isArchived === "boolean" ? raw.isArchived : original.isArchived,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : original.sortOrder
    } };
    const previous = parseWikiBatchImport(JSON.stringify({ pages: [{ ...original, children: [] }] }))[0];
    const nextImages = wikiImageCounts(contentMarkdown);
    let missingImages = 0;
    for (const [id, count] of wikiImageCounts(original.contentMarkdown)) missingImages += Math.max(0, count - (nextImages.get(id) ?? 0));
    const previousPage = { ...update.page, title: previous.title, slug: previous.slug, summary: previous.summary ?? undefined,
      contentMarkdown: previous.contentMarkdown ?? "", sources: previous.sources ?? [], quizQuestions: previous.quizQuestions ?? [],
      flashcards: previous.flashcards ?? [], isArchived: original.isArchived, sortOrder: original.sortOrder };
    summaries.push({ id: original.id, title: update.page.title, path: original.path,
      changed: JSON.stringify(previousPage) !== JSON.stringify(update.page), missingImages,
      removedChecks: Math.max(0, original.quizQuestions.length - (normalized.quizQuestions?.length ?? 0)) + Math.max(0, original.flashcards.length - (normalized.flashcards?.length ?? 0)),
      removedSources: Math.max(0, original.sources.length - (normalized.sources?.length ?? 0)),
      clearedContent: !!original.contentMarkdown.trim() && !contentMarkdown.trim()
    });
    updates.push(update);
    if (Object.hasOwn(raw, "children") && !Array.isArray(raw.children)) throw new Error("children must be an array; omit it to leave subpages untouched.");
    if (Array.isArray(raw.children)) raw.children.forEach(child => visit(child, original.id));
  }
  visit(rawPages[0]);
  return { updates, summaries, untouchedPages: originals.length - seen.size,
    missingImages: summaries.reduce((sum, summary) => sum + summary.missingImages, 0) };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
