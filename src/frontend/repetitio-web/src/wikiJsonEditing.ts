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

export function planWikiJsonEdit(source: string, baseline: WikiJsonDocument, useCurrentVersions = false) {
  const parsed: unknown = JSON.parse(source);
  const rawPages = Array.isArray(parsed) ? parsed : record(parsed) ? parsed.pages : undefined;
  if (!Array.isArray(rawPages) || !rawPages.length) throw new Error("JSON must contain a non-empty pages array.");
  const originals = flattenWikiJson(baseline);
  const root = baseline.pages[0];
  if (!root) throw new Error("Reload the selected article before editing.");
  const byId = new Map(originals.map(page => [page.id, page]));
  const entries = new Map<string, { raw: Record<string, unknown>; parentId: string | null }>();
  const updates: WikiJsonPageUpdate[] = [];
  const summaries: { id: string; title: string; path: string; changed: boolean; isNew: boolean; missingImages: number; removedChecks: number; removedSources: number; clearedContent: boolean }[] = [];
  let rebasedPages = 0;

  function collect(raw: unknown, nestedParent?: string) {
    if (!record(raw)) throw new Error("Each page must be an object.");
    if (Object.hasOwn(raw, "id") && typeof raw.id !== "string") throw new Error("id must be a page ID, or omit it for a new page.");
    const id = typeof raw.id === "string" ? raw.id : crypto.randomUUID();
    if (entries.has(id)) throw new Error("Every page needs a unique id.");
    if (Object.hasOwn(raw, "parentId") && raw.parentId !== null && typeof raw.parentId !== "string")
      throw new Error("parentId must be a page ID or null.");
    if (nestedParent !== undefined && Object.hasOwn(raw, "parentId") && raw.parentId !== nestedParent)
      throw new Error("A nested page's parentId must match the page containing it.");
    const original = byId.get(id);
    const parentId = nestedParent ?? (Object.hasOwn(raw, "parentId") ? raw.parentId as string | null : original?.parentId ?? null);
    entries.set(id, { raw, parentId });
    if (entries.size > 500) throw new Error("JSON editing supports at most 500 pages at once.");
    if (Object.hasOwn(raw, "children") && !Array.isArray(raw.children)) throw new Error("children must be an array; omit it to leave subpages untouched.");
    if (Array.isArray(raw.children)) raw.children.forEach(child => collect(child, id));
  }
  if (!rawPages.some(raw => record(raw) && raw.id === root.id))
    throw new Error("This JSON is outside the selected article. Keep the original root ID.");
  rawPages.forEach(raw => collect(raw));
  if (!entries.has(root.id)) throw new Error("This JSON is outside the selected article. Keep the original root ID.");
  if (entries.get(root.id)!.parentId !== root.parentId) throw new Error("The selected article's parentId is read-only.");

  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error("The page hierarchy contains a cycle.");
    visiting.add(id);
    const { raw, parentId } = entries.get(id)!;
    const original = byId.get(id);
    const isNew = !original;
    if (id !== root.id) {
      if (parentId === null || !entries.has(parentId))
        throw new Error("Every subpage must connect to the selected article through a parent included in this JSON.");
      visit(parentId);
    }
    if (original && parentId !== original.parentId)
      throw new Error("Keep the original parentId of existing pages. New subpages can be added underneath them.");
    if (isNew && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      throw new Error("New page IDs must be valid UUIDs, or omit id to generate one.");
    if (original && raw.updatedAt !== original.updatedAt) {
      if (!useCurrentVersions) throw new Error("updatedAt differs from the current export. Reload the JSON, or explicitly enable reviewing against current page versions.");
      rebasedPages++;
    }
    if (Object.hasOwn(raw, "isArchived") && typeof raw.isArchived !== "boolean") throw new Error("isArchived must be a boolean.");
    if (Object.hasOwn(raw, "sortOrder") && (typeof raw.sortOrder !== "number" || !Number.isInteger(raw.sortOrder) || raw.sortOrder < 0 || raw.sortOrder > 100000))
      throw new Error("sortOrder must be an integer between 0 and 100000.");
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
    const update: WikiJsonPageUpdate = { id, expectedUpdatedAt: original?.updatedAt ?? null, isNew, page: {
      parentId, title: normalized.title, slug: normalized.slug ?? original?.slug,
      summary: normalized.summary ?? undefined, contentMarkdown, sources: normalized.sources ?? [],
      quizQuestions: normalized.quizQuestions ?? [], flashcards: normalized.flashcards ?? [],
      isArchived: typeof raw.isArchived === "boolean" ? raw.isArchived : original?.isArchived ?? false,
      sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : original?.sortOrder ?? updates.length
    } };
    const previous = original ? parseWikiBatchImport(JSON.stringify({ pages: [{ ...original, children: [] }] }))[0] : null;
    const previousPage = previous ? { ...update.page, title: previous.title, slug: previous.slug, summary: previous.summary ?? undefined,
      contentMarkdown: previous.contentMarkdown ?? "", sources: previous.sources ?? [], quizQuestions: previous.quizQuestions ?? [],
      flashcards: previous.flashcards ?? [], isArchived: original!.isArchived, sortOrder: original!.sortOrder } : null;
    const parentPath = summaries.find(summary => summary.id === parentId)?.path ?? byId.get(parentId ?? "")?.path;
    summaries.push({ id, title: update.page.title, path: original?.path ?? [parentPath, update.page.slug || update.page.title].filter(Boolean).join("/"),
      changed: isNew || JSON.stringify(previousPage) !== JSON.stringify(update.page), isNew, missingImages: 0,
      removedChecks: Math.max(0, (original?.quizQuestions.length ?? 0) - (normalized.quizQuestions?.length ?? 0)) + Math.max(0, (original?.flashcards.length ?? 0) - (normalized.flashcards?.length ?? 0)),
      removedSources: Math.max(0, (original?.sources.length ?? 0) - (normalized.sources?.length ?? 0)),
      clearedContent: !!original?.contentMarkdown.trim() && !contentMarkdown.trim()
    });
    updates.push(update);
    visiting.delete(id);
    visited.add(id);
  }
  entries.forEach((_, id) => visit(id));

  // Images can move between edited pages. Only a loss across the entire edit needs confirmation.
  const remainingImages = new Map<string, number>();
  for (const update of updates) {
    for (const [id, count] of wikiImageCounts(update.page.contentMarkdown ?? ""))
      remainingImages.set(id, (remainingImages.get(id) ?? 0) + count);
  }
  for (const summary of summaries) {
    for (const [id, count] of wikiImageCounts(byId.get(summary.id)?.contentMarkdown ?? "")) {
      const available = remainingImages.get(id) ?? 0;
      summary.missingImages += Math.max(0, count - available);
      remainingImages.set(id, Math.max(0, available - count));
    }
  }
  return { updates, summaries, untouchedPages: originals.filter(page => !entries.has(page.id)).length,
    createdPages: summaries.filter(page => page.isNew).length, rebasedPages,
    missingImages: summaries.reduce((sum, summary) => sum + summary.missingImages, 0) };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
