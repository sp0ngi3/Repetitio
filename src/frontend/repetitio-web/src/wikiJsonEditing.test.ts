import { describe, expect, it } from "vitest";
import type { WikiJsonDocument, WikiJsonPage } from "./types";
import { flattenWikiJson, planWikiJsonEdit, wikiImageCounts } from "./wikiJsonEditing";

const imageId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
function page(id: string, parentId: string | null = null): WikiJsonPage {
  return {
    id, parentId, title: id, slug: id, path: parentId ? `${parentId}/${id}` : id, depth: parentId ? 1 : 0,
    sortOrder: 0, summary: "Original summary", contentMarkdown: `## Topic\n\nBefore.\n\n![Diagram](wiki-image:${imageId})\n\nAfter.`,
    isArchived: false, childCount: 0, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z",
    sources: [{ id: "source", title: "Book", type: "Book", sortOrder: 0 }],
    quizQuestions: [{ id: "quiz", prompt: "Which answer?", sortOrder: 0, options: [
      { id: "a", text: "Correct", isCorrect: true, sortOrder: 0 }, { id: "b", text: "Incorrect", isCorrect: false, sortOrder: 1 }
    ] }],
    flashcards: [{ id: "card", front: "Question", back: "Answer", sortOrder: 0 }], children: [],
    images: [{ id: imageId, fileName: "diagram.png", reference: `wiki-image:${imageId}`, url: `/api/wiki/images/${imageId}`, sha256: "hash", occurrences: 1, lines: [5] }]
  };
}
function fixture(): WikiJsonDocument {
  const root = page("root");
  root.children = [page("child", root.id)]; root.childCount = 1;
  return { pages: [root] };
}

describe("Wiki JSON editing", () => {
  it("round trips exported pages without changes or lost image positions", () => {
    const baseline = fixture();
    const plan = planWikiJsonEdit(JSON.stringify(baseline), baseline);
    expect(plan.summaries.every(item => !item.changed)).toBe(true);
    expect(plan.updates[0].page.contentMarkdown).toBe(baseline.pages[0].contentMarkdown);
    expect(plan.missingImages).toBe(0);
    expect(plan.untouchedPages).toBe(0);
  });

  it("keeps omitted article fields and omitted subpages", () => {
    const baseline = fixture();
    const root = baseline.pages[0];
    const plan = planWikiJsonEdit(JSON.stringify({ pages: [{ id: root.id, updatedAt: root.updatedAt, title: "Updated" }] }), baseline);
    expect(plan.untouchedPages).toBe(1);
    expect(plan.updates[0].page).toMatchObject({ title: "Updated", contentMarkdown: root.contentMarkdown });
    expect(plan.updates[0].page.flashcards).toEqual([{ front: "Question", back: "Answer" }]);
    expect(plan.updates[0].page.quizQuestions).toHaveLength(1);
    expect(plan.updates[0].page.sources).toHaveLength(1);
    expect(baseline.pages[0].title).toBe("root");
    expect(flattenWikiJson(baseline)).toHaveLength(2);
  });

  it("appends article vocabulary while preserving the original Markdown and image", () => {
    const baseline = fixture();
    const edited = structuredClone(baseline);
    Object.assign(edited.pages[0], { appendSections: [{ heading: "Vocabulary", definitions: [{ term: "Invariant", definition: "A property that remains true." }] }] });
    const plan = planWikiJsonEdit(JSON.stringify(edited), baseline);
    expect(plan.updates[0].page.contentMarkdown).toContain(baseline.pages[0].contentMarkdown);
    expect(plan.updates[0].page.contentMarkdown).toContain("Invariant");
    expect(plan.missingImages).toBe(0);
    expect(plan.summaries[0].changed).toBe(true);
    expect(plan.summaries[1].changed).toBe(false);
  });

  it("can rebuild structured sections with an existing image block", () => {
    const baseline = fixture();
    const edited = { id: "root", updatedAt: baseline.pages[0].updatedAt, sections: [{ heading: "Updated topic", blocks: [
      { type: "paragraph", text: "Before." }, { type: "image", imageId, alt: "Diagram", caption: "Existing image" },
      { type: "paragraph", text: "After." }
    ] }] };
    const plan = planWikiJsonEdit(JSON.stringify({ pages: [edited] }), baseline);
    expect(plan.updates[0].page.contentMarkdown).toContain(`![Diagram](wiki-image:${imageId})`);
    expect(plan.missingImages).toBe(0);
  });

  it("counts dropped occurrences of an image, including alternative local URLs", () => {
    const baseline = fixture();
    baseline.pages[0].contentMarkdown += `\n\n![Again](/api/wiki/images/${imageId})`;
    const edited = structuredClone(baseline);
    edited.pages[0].contentMarkdown = `![Diagram](wiki-image:${imageId.toUpperCase()})`;
    expect(planWikiJsonEdit(JSON.stringify(edited), baseline).missingImages).toBe(1);
    expect(wikiImageCounts(baseline.pages[0].contentMarkdown).get(imageId)).toBe(2);
  });

  it("shows explicit clearing of checks, sources and content without deleting subpages", () => {
    const baseline = fixture();
    const edited = { ...baseline.pages[0], contentMarkdown: "", quizQuestions: [], flashcards: [], sources: [], children: [] };
    const plan = planWikiJsonEdit(JSON.stringify({ pages: [edited] }), baseline);
    expect(plan.summaries[0]).toMatchObject({ removedChecks: 2, removedSources: 1, missingImages: 1, clearedContent: true });
    expect(plan.untouchedPages).toBe(1);
  });

  it.each([
    ["outdated version", (root: WikiJsonPage) => { root.updatedAt = "2025-01-01"; }, /updatedAt/],
    ["unknown ID", (root: WikiJsonPage) => { root.id = "unknown"; }, /outside/],
    ["moved page", (root: WikiJsonPage) => { root.parentId = "child"; }, /parentId/],
    ["duplicated child", (root: WikiJsonPage) => { root.children.push(root.children[0]); }, /unique id/],
    ["invalid order", (root: WikiJsonPage) => { root.sortOrder = -1; }, /sortOrder/],
    ["ambiguous body", (root: WikiJsonPage) => { Object.assign(root, { sections: [] }); }, /not both/]
  ])("rejects %s", (_, edit, message) => {
    const baseline = fixture();
    const edited = structuredClone(baseline);
    edit(edited.pages[0]);
    expect(() => planWikiJsonEdit(JSON.stringify(edited), baseline)).toThrow(message);
  });
});
