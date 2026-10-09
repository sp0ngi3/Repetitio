import { ActionIcon } from "./ActionIcon";
import { ChangeEvent, ClipboardEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  createWikiPage,
  deleteWikiPage,
  getWikiPage,
  getWikiPages,
  getWikiTree,
  getWikiStudy,
  importWikiImageUrl,
  importWikiPages,
  uploadWikiImage,
  updateWikiPage
} from "./api";
import { confirmDelete } from "./confirmDelete";
import type {
  CreateWikiPageRequest,
  WikiPage as WikiPageRecord,
  WikiFlashcardRequest,
  WikiQuizQuestionRequest,
  WikiSourceRequest,
  WikiTreeNode
} from "./types";
import type { WikiStudyOverview, WikiStudyPageProgress, WikiStudyModeProgress } from "./types";
import { WikiLearningPlayer, WikiProgressSummary, WikiReviewDashboard, WikiBranchProgress, studyItems } from "./WikiLearning";
import type { WikiStudyItem } from "./WikiLearning";
import { renderWikiMarkdown as renderMarkdown, renderWikiMarkdownHtml, type MarkdownHeading } from "./wikiMarkdown";
import { parseWikiBatchImport, parseWikiSourcesJson, parseWikiQuizJson, parseWikiFlashcardJson, wikiLearningContainer } from "./wikiImport";
import { WikiJsonEditor } from "./WikiJsonEditor";
import { FileJson, Workflow } from "lucide-react";
import { codeLanguages } from "./codeHighlight";
import { renderPrintableDiagrams } from "./diagramRenderer";
import { useWikiScrollSync } from "./wikiScrollSync";
export { parseWikiBatchImport } from "./wikiImport";

type WikiView = "article" | "explore" | "edit" | "json" | "import" | "study" | "reviews";
type WikiSort = "updated-newest" | "updated-oldest" | "title" | "tree";
type WikiStudyScope = "current" | "branch" | "all" | "custom";
type WikiStudyMode = "quiz" | "flashcards" | "both";
type WikiStudyOrder = "page-order" | "random";
type WikiStudyAmount = "all" | "limited";

interface WikiForm {
  parentId: string;
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
  sourcesJson: string;
  quizJson: string;
  flashcardsJson: string;
  sortOrder: number;
  isArchived: boolean;
}

interface NestedWikiTreeNode extends WikiTreeNode {
  children: NestedWikiTreeNode[];
}

const wikiPageSize = 15;

const emptyWikiForm: WikiForm = {
  parentId: "",
  title: "",
  slug: "",
  summary: "",
  contentMarkdown: "## Definition\n\n\n## Key points\n\n- \n\n## Comparison\n\n| Topic | Notes |\n| --- | --- |\n|  |  |\n",
  sourcesJson: "[]",
  quizJson: "[]",
  flashcardsJson: "[]",
  sortOrder: 0,
  isArchived: false
};

const sampleWikiSourcesJson = JSON.stringify(
  [
    {
      title: "Designing Data-Intensive Applications",
      type: "Book",
      author: "Martin Kleppmann",
      locator: "Chapter 5 - Replication",
      notes: "Use as the main explanation source for replication tradeoffs."
    },
    {
      title: "System Design Interview",
      type: "Book",
      author: "Alex Xu",
      locator: "Load balancer section",
      notes: "Good interview-style framing and diagrams."
    }
  ],
  null,
  2
);

const sampleWikiQuizJson = JSON.stringify(
  [
    {
      prompt: "What is the strongest signal that this topic is understood?",
      options: [
        { text: "I can define it only.", isCorrect: false },
        { text: "I can explain it, apply it, and name the tradeoffs.", isCorrect: true },
        { text: "I can recognize the name.", isCorrect: false },
        { text: "I memorized one sentence.", isCorrect: false }
      ],
      explanation: "A good interview answer combines definition, usage, constraints, and tradeoffs."
    }
  ],
  null,
  2
);

const sampleWikiFlashcardsJson = JSON.stringify(
  [
    {
      front: "What should this wiki page help me recall?",
      back: "The definition, the core mental model, common edge cases, and interview signals."
    }
  ],
  null,
  2
);

export const sampleImport = JSON.stringify(
  {
    pages: [
      {
        title: "Algorithm",
        slug: "algorithm",
        summary: "A precise procedure for transforming input into a useful result.",
        lead: [
          "An algorithm is a finite, well-defined sequence of steps used to solve a class of problems.",
          "In interview prep, algorithm notes should capture the definition, core idea, constraints, examples, and implementation pitfalls."
        ],
        infobox: {
          "Area": "Computer science",
          "Used for": "Problem solving, automation, data processing",
          "Common analysis": "Time and space complexity"
        },
        sections: [
          {
            heading: "Classical definition",
            quote: "A deterministic procedure that maps valid input to expected output in a finite number of steps.",
            paragraphs: [
              "A useful algorithm description explains the input, the output, the stopping condition, and why the result is correct."
            ],
            sections: [
              {
                heading: "Example",
                paragraphs: [
                  "Finding the maximum value in a non-empty list can be expressed as a simple scan."
                ],
                steps: [
                  "Store the first value as the current maximum.",
                  "Visit each next value once.",
                  "Replace the maximum when the current value is larger.",
                  "Return the maximum after the scan ends."
                ]
              }
            ]
          },
          {
            heading: "Classification",
            paragraphs: [
              "Algorithms are often grouped by the design strategy they use."
            ],
            list: [
              "**Divide and conquer** - split the problem into smaller independent parts.",
              "**Dynamic programming** - reuse overlapping subproblem results.",
              "**Greedy algorithms** - choose the locally best move when that choice is safe.",
              "**Backtracking** - explore candidates and undo invalid choices."
            ],
            table: {
              headers: ["Technique", "Typical signal", "Interview example"],
              rows: [
                ["Binary search", "Sorted search space", "Find boundary condition"],
                ["Graph traversal", "Nodes and edges", "BFS shortest path"],
                ["Dynamic programming", "Overlapping subproblems", "Maximum subarray"]
              ]
            }
          },
          {
            heading: "Implementation",
            paragraphs: [
              "Implementation quality depends on clear invariants, edge-case handling, and complexity awareness."
            ],
            code: {
              language: "csharp",
              content: "public int Max(int[] nums)\n{\n    int best = nums[0];\n    foreach (var value in nums)\n    {\n        best = Math.Max(best, value);\n    }\n    return best;\n}"
            }
          },
          {
            heading: "Visual walkthrough",
            code: {
              language: "mermaid",
              content: "flowchart LR\n    Input[Non-empty input] --> Initialize[best = first value]\n    Initialize --> Scan[Compare each remaining value]\n    Scan --> Result[Return the maximum]"
            }
          },
          {
            heading: "Study guide",
            definitions: [
              { term: "Invariant", definition: "A property that remains true before and after each step of an algorithm." },
              { term: "Time complexity", definition: "How the number of operations grows with the input size; for example, **O(n)** for a single scan." }
            ],
            list: [
              { text: "Before coding", items: ["Clarify the input and output.", "Choose an invariant."] },
              { text: "After coding", items: ["Trace edge cases.", "Explain time and space complexity."] }
            ],
            checklist: ["Explain the invariant without looking at the code.", { text: "Trace the algorithm on negative inputs.", checked: false }],
            blocks: [
              { type: "callout", kind: "pitfall", title: "Do not assume inputs are positive", text: "Initializing the maximum to zero fails when every input value is negative. Initialize it to the first element." },
              { type: "example", title: "Tracing a maximum scan", input: "`[-5, -2, -7]`", steps: ["Set best to -5.", "Compare -2 with -5 and update best to -2.", "Compare -7 with -2; keep best at -2."], output: "`-2`", explanation: "The current best is the largest value in the prefix already visited." },
              { type: "recall", prompt: "Maximum scan: why is initializing best to zero incorrect for an all-negative array?", hint: "Trace `[-5, -2, -7]`.", answer: "Zero is not in the input and is greater than every value. Initialize best to the first element instead." },
              { type: "details", title: "Why one pass is enough", paragraphs: ["Each element is compared with the best value seen so far. After the final element, the best covers the entire input."], code: { language: "csharp", content: "int best = nums[0];\nforeach (int value in nums)\n{\n    best = Math.Max(best, value);\n}" } },
              { type: "takeaways", items: ["State the invariant before coding.", "Check empty and negative inputs.", "A single scan takes O(n) time and O(1) extra space."] }
            ]
          }
        ],
        seeAlso: ["Data structures", "Time complexity", "Dynamic programming"],
        references: [
          {
            label: "Personal interview notes",
            url: "https://example.com/notes"
          }
        ],
        sources: [
          {
            title: "Designing Data-Intensive Applications",
            type: "Book",
            author: "Martin Kleppmann",
            locator: "Chapter 1",
            notes: "Used for reliability, scalability, and maintainability framing."
          }
        ],
        externalLinks: [
          {
            label: "Wikipedia-style article used as a layout reference",
            url: "https://pl.wikipedia.org/wiki/Algorytm"
          }
        ],
        quizQuestions: [
          {
            prompt: "Which description best captures an algorithm?",
            options: [
              { text: "A random collection of implementation details.", isCorrect: false },
              { text: "A finite, well-defined procedure for solving a class of problems.", isCorrect: true },
              { text: "Only code written in a specific programming language.", isCorrect: false },
              { text: "A database schema.", isCorrect: false }
            ],
            explanation: "The key properties are finite steps, clear input/output, and a defined stopping point."
          }
        ],
        flashcards: [
          {
            front: "What makes an algorithm description useful in interviews?",
            back: "It names input, output, invariants, stopping condition, correctness intuition, and complexity."
          }
        ],
        children: [
          {
            title: "Maximum Subarray",
            summary: "Kadane's algorithm as a concrete application.",
            sections: [
              {
                heading: "Idea",
                paragraphs: ["Track the best sum ending at the current index and the best sum seen globally."]
              }
            ]
          }
        ]
      }
    ]
  },
  null,
  2
);

export function WikiPage({ focusPageId, focusStudyKind }: {
  focusPageId?: string;
  focusStudyKind?: WikiStudyModeProgress["kind"];
} = {}) {
  const [focusedPractice, setFocusedPractice] = useState(!!focusPageId && !!focusStudyKind);
  const [studyOverview, setStudyOverview] = useState<WikiStudyOverview | null>(null);
  const [treeSearch, setTreeSearch] = useState("");
  const [treeNodes, setTreeNodes] = useState<WikiTreeNode[]>([]);
  const [pages, setPages] = useState<WikiPageRecord[]>([]);
  const [selectedPage, setSelectedPage] = useState<WikiPageRecord | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<WikiView>(focusPageId ? "study" : "article");
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<WikiSort>("updated-newest");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [form, setForm] = useState<WikiForm>(emptyWikiForm);
  const [batchParentId, setBatchParentId] = useState("");
  const [batchJson, setBatchJson] = useState(sampleImport);
  const [batchFileName, setBatchFileName] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<string | null>(null);
  const [showImportStructure, setShowImportStructure] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / wikiPageSize));
  const nestedTree = useMemo(() => buildNestedTree(treeNodes), [treeNodes]);
  const visibleTree = useMemo(() => filterTopicTree(nestedTree, treeSearch), [nestedTree, treeSearch]);
  const descendantIds = useMemo(
    () => editingPageId ? collectDescendantIds(treeNodes, editingPageId) : new Set<string>(),
    [editingPageId, treeNodes]
  );
  const renderedMarkdown = useMemo(
    () => renderMarkdown(selectedPage?.contentMarkdown ?? "", selectedPage?.id),
    [selectedPage?.contentMarkdown, selectedPage?.id]
  );
  const articleChildren = useMemo(
    () => selectedPage ? treeNodes.filter((node) => node.parentId === selectedPage.id) : [],
    [selectedPage, treeNodes]
  );

  async function loadWiki(preferredPageId = selectedPage?.id ?? focusPageId ?? null) {
    setError(null);
    setIsLoading(true);

    try {
      const [nextTree, nextPages, nextStudy] = await Promise.all([
        getWikiTree(includeArchived),
        getWikiPages({ search, includeArchived, sort, page, pageSize: wikiPageSize }),
        getWikiStudy()
      ]);
      setStudyOverview(nextStudy);
      setTreeNodes(nextTree);
      setPages(nextPages.items);
      setTotalCount(nextPages.totalCount);
      autoExpandTopLevels(nextTree);

      const idToOpen = preferredPageId
        ?? nextPages.items[0]?.id
        ?? nextTree[0]?.id
        ?? null;

      if (idToOpen) {
        const pageRecord = await getWikiPage(idToOpen);
        setSelectedPage(pageRecord);
        setForm(createWikiForm(pageRecord));
        expandAncestors(pageRecord, nextTree);
      } else {
        setSelectedPage(null);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load wiki pages.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadWiki();
  }, [includeArchived, page, search, sort]);

  useEffect(() => {
    const refresh = () => { void getWikiStudy().then(setStudyOverview).catch(() => setError("Unable to refresh Wiki review progress.")); };
    window.addEventListener("wiki-study-updated", refresh);
    return () => window.removeEventListener("wiki-study-updated", refresh);
  }, []);

  async function selectPage(id: string) {
    setError(null);
    setFocusedPractice(false);

    try {
      const pageRecord = await getWikiPage(id);
      setSelectedPage(pageRecord);
      setForm(createWikiForm(pageRecord));
      setEditingPageId(null);
      setView("article");
      expandAncestors(pageRecord, treeNodes);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load wiki page.");
    }
  }

  function startNewRootPage() {
    setEditingPageId(null);
    setForm(emptyWikiForm);
    setView("edit");
  }

  function startNewChildPage(parentId = selectedPage?.id ?? "") {
    setEditingPageId(null);
    setForm({ ...emptyWikiForm, parentId });
    setView("edit");
  }

  function startEditPage() {
    if (!selectedPage) {
      startNewRootPage();
      return;
    }

    setEditingPageId(selectedPage.id);
    setForm(createWikiForm(selectedPage));
    setView("edit");
  }

  function updateForm<K extends keyof WikiForm>(key: K, value: WikiForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const savedPage = editingPageId
        ? await updateWikiPage(editingPageId, {
          ...toCreateWikiPageRequest(form),
          sortOrder: form.sortOrder,
          isArchived: form.isArchived
        })
        : await createWikiPage(toCreateWikiPageRequest(form));

      setSelectedPage(savedPage);
      setEditingPageId(null);
      setForm(createWikiForm(savedPage));
      setView("article");
      await loadWiki(savedPage.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save wiki page.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingPageId) {
      return;
    }

    const targetTitle = (selectedPage?.title ?? form.title.trim()) || "this article";

    if (!confirmDelete(`wiki article "${targetTitle}"`, "This will delete the article and its subtopics.")) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await deleteWikiPage(editingPageId);
      setSelectedPage(null);
      setEditingPageId(null);
      setForm(emptyWikiForm);
      setView("explore");
      await loadWiki(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete wiki page.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBatchImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setBatchResult(null);

    try {
      const pagesToImport = parseWikiBatchImport(batchJson);

      const result = await importWikiPages({
        parentId: batchParentId || null,
        pages: pagesToImport
      });
      const firstImported = result.rootPages[0] ?? null;
      setBatchResult(`Imported ${result.importedCount} wiki pages.`);
      setView(firstImported ? "article" : "explore");

      if (firstImported) {
        setSelectedPage(firstImported);
        await loadWiki(firstImported.id);
      } else {
        await loadWiki();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to import wiki pages.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBatchFileSelected(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    setBatchResult(null);

    if (!file.name.toLowerCase().endsWith(".json")) {
      setError("Please choose a .json file.");
      return;
    }

    try {
      setBatchJson(await file.text());
      setBatchFileName(file.name);
      setBatchResult(`Loaded ${file.name}. Review the JSON and import when ready.`);
    } catch {
      setError("Unable to read the selected JSON file.");
    }
  }

  async function handleDownloadPdf() {
    if (!selectedPage) {
      return;
    }

    setError(null);

    try {
      const subtreeIds = collectSubtreeIds(treeNodes, selectedPage.id);
      const pagesToPrint = await Promise.all(subtreeIds.map((id) => id === selectedPage.id ? selectedPage : getWikiPage(id)));
      await openWikiPdfPrintWindow(selectedPage.title, pagesToPrint);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to prepare wiki PDF.");
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function autoExpandTopLevels(nodes: WikiTreeNode[]) {
    setExpandedIds((current) => {
      const next = new Set(current);
      nodes.filter((node) => node.depth <= 1).forEach((node) => next.add(node.id));
      return next;
    });
  }

  function expandAncestors(wikiPage: WikiPageRecord, nodes: WikiTreeNode[]) {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const nextExpanded = new Set(expandedIds);
    let parentId = wikiPage.parentId ?? null;

    while (parentId) {
      nextExpanded.add(parentId);
      parentId = nodeById.get(parentId)?.parentId ?? null;
    }

    setExpandedIds(nextExpanded);
  }

  return (
    <section className="wiki-page wiki-wikipedia-page" data-view={view} aria-labelledby="wiki-title">
      <header className="wiki-shell-header">
        <div>
          <p className="eyebrow">Repositorium</p>
          <h2 id="wiki-title">Wiki</h2>
        </div>
        <nav className="wiki-page-tabs" aria-label="Wiki navigation">
          <button className={view === "article" ? "active" : ""} type="button" onClick={() => setView("article")}>
            <ActionIcon label="Article" />Article
          </button>
          <button className={view === "explore" ? "active" : ""} type="button" onClick={() => setView("explore")}>
            Explore
          </button>
          <button className={view === "study" ? "active" : ""} type="button" disabled={!selectedPage} onClick={() => setView("study")}><ActionIcon label="Study" />Study</button>
          <button className={view === "reviews" ? "active" : ""} type="button" onClick={() => setView("reviews")}>Reviews</button>
          <button className={view === "edit" ? "active" : ""} type="button" onClick={startEditPage}>
            {selectedPage ? "Edit" : "Create"}
          </button>
          <button className={view === "import" ? "active" : ""} type="button" onClick={() => setView("import")}>
            Batch import
          </button>
        </nav>
      </header>

      {error ? <p className="error-banner">{error}</p> : null}
      {batchResult ? <p className="success-banner">{batchResult}</p> : null}

      {selectedPage ? <nav className="wiki-breadcrumbs" aria-label="Current topic location">
        <button className="text-button" type="button" onClick={() => setView("explore")}>Repository</button>
        {treeNodes.filter(node => selectedPage.path === node.path || selectedPage.path.startsWith(node.path + "/"))
          .sort((left, right) => left.depth - right.depth).map(node => <span key={node.id}>
            <span aria-hidden="true"> / </span><button className="text-button" type="button" aria-current={node.id === selectedPage.id ? "page" : undefined} onClick={() => void selectPage(node.id)}>{node.title}</button>
          </span>)}
      </nav> : null}

      <div className="wiki-reading-layout">
        <aside className="wiki-left-rail" aria-label="Wiki topic tree">
          <div className="wiki-rail-heading">
            <strong>Topic library</strong>
            <button className="text-button" type="button" onClick={startNewRootPage}>
              <ActionIcon label="Add topic" />Add topic
            </button>
          </div>
          <label className="wiki-tree-search">Find a topic<input aria-label="Search topic tree" value={treeSearch} onChange={event => setTreeSearch(event.target.value)} placeholder="Topic or path..." /></label>
          {nestedTree.length ? (
            <ul className="wiki-tree">
              {visibleTree.map((node) => (
                <WikiTreeNodeView
                  expandedIds={treeSearch ? new Set(treeNodes.map(n => n.id)) : expandedIds}
                  key={node.id}
                  node={node}
                  selectedPageId={selectedPage?.id ?? null}
                  onSelect={selectPage}
                  onToggle={toggleExpanded}
                />
              ))}
            </ul>
          ) : (
            <p className="empty-state">No pages yet.</p>
          )}
        </aside>

        {view === "article" ? (
          <WikiArticle
            key={selectedPage?.id}
            progress={studyOverview?.pages.find(p => p.id === selectedPage?.id)}
            branchProgress={studyOverview?.pages ?? []}
            onStudy={() => setView("study")}
            childNodes={articleChildren}
            isLoading={isLoading}
            page={selectedPage}
            renderedMarkdown={renderedMarkdown}
            treeNodes={treeNodes}
            onCreateChild={() => startNewChildPage()}
            onDownloadPdf={handleDownloadPdf}
            onEdit={startEditPage}
            onEditJson={() => setView("json")}
            onOpenChild={selectPage}
          />
        ) : null}

        {view === "explore" ? (
          <WikiExplore
            progress={studyOverview?.pages ?? []}
            includeArchived={includeArchived}
            isLoading={isLoading}
            page={page}
            pages={pages}
            search={search}
            selectedPageId={selectedPage?.id ?? null}
            sort={sort}
            totalCount={totalCount}
            totalPages={totalPages}
            onCreate={startNewRootPage}
            onIncludeArchivedChange={(value) => {
              setIncludeArchived(value);
              setPage(1);
            }}
            onPageChange={setPage}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            onSelect={selectPage}
            onSortChange={setSort}
          />
        ) : null}

        {view === "study" && selectedPage ? <main className="wiki-document wiki-study-view">
          <header className="wiki-special-header"><div><span className="wiki-path">{selectedPage.path}</span><h1>Study: {selectedPage.title}</h1></div>
            <button className="secondary-button" type="button" onClick={() => setView("article")}><ActionIcon label="Back to article" />Back to article</button></header>
          <WikiProgressSummary progress={studyOverview?.pages.find(p => p.id === selectedPage.id)} />
          <WikiBranchProgress topics={studyOverview?.pages ?? []} rootId={selectedPage.id} />
          {focusedPractice && selectedPage.id === focusPageId && studyItems([selectedPage], focusStudyKind === "quiz" ? "quiz" : "flashcards").length
            ? <WikiLearningPlayer items={studyItems([selectedPage], focusStudyKind === "quiz" ? "quiz" : "flashcards")} onClose={() => setFocusedPractice(false)} />
            : <WikiStudyBuilder key={selectedPage.id} currentPage={selectedPage} treeNodes={treeNodes.filter(node => !studyOverview?.pages.find(p => p.id === node.id)?.isArchived)} />}
          {studyOverview?.history.length ? <details className="wiki-session-history"><summary>Recent study sessions</summary>
            {studyOverview.history.map(session => <div key={session.id}><time>{formatDateTime(session.completedAt)}</time><span>{session.correct} / {session.answered} correct</span></div>)}
          </details> : null}
        </main> : null}

        {view === "reviews" ? <main className="wiki-document"><WikiReviewDashboard overview={studyOverview} onSelect={id => void selectPage(id)} /></main> : null}

        {view === "json" && selectedPage ? <WikiJsonEditor key={selectedPage.id} pageId={selectedPage.id}
          onCancel={() => setView("article")} onSaved={async id => { await loadWiki(id); setView("article"); }} /> : null}

        {view === "edit" ? (
          <WikiEditor
            descendantIds={descendantIds}
            editingPageId={editingPageId}
            form={form}
            isSaving={isSaving}
            selectedPage={selectedPage}
            treeNodes={treeNodes}
            onCancel={() => setView(selectedPage ? "article" : "explore")}
            onDelete={handleDelete}
            onSubmit={handleSubmit}
            onUpdate={updateForm}
          />
        ) : null}

        {view === "import" ? (
          <WikiBatchImport
            batchFileName={batchFileName}
            batchJson={batchJson}
            isSaving={isSaving}
            parentId={batchParentId}
            showImportStructure={showImportStructure}
            treeNodes={treeNodes}
            onBatchFileSelected={handleBatchFileSelected}
            onBatchJsonChange={setBatchJson}
            onParentChange={setBatchParentId}
            onToggleImportStructure={() => setShowImportStructure((isShown) => !isShown)}
            onSubmit={handleBatchImport}
          />
        ) : null}
      </div>
    </section>
  );
}

function WikiArticle(props: {
  progress?: WikiStudyPageProgress;
  branchProgress: WikiStudyPageProgress[];
  onStudy: () => void;
  page: WikiPageRecord | null;
  renderedMarkdown: { nodes: ReactNode[]; headings: MarkdownHeading[] };
  childNodes: WikiTreeNode[];
  treeNodes: WikiTreeNode[];
  isLoading: boolean;
  onEdit: () => void;
  onEditJson: () => void;
  onCreateChild: () => void;
  onDownloadPdf: () => void;
  onOpenChild: (id: string) => void;
}) {
  const hasKnowledgeChecks = Boolean(props.page && props.treeNodes.length > 0);
  const [activeHeading, setActiveHeading] = useState("");
  useEffect(() => {
    setActiveHeading(props.renderedMarkdown.headings[0]?.id ?? "");
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveHeading(visible[0].target.id);
    }, { rootMargin: "-5% 0px -75% 0px" });
    props.renderedMarkdown.headings.forEach(heading => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [props.page?.id, props.isLoading, props.renderedMarkdown.headings]);

  if (props.isLoading) {
    return <main className="wiki-document"><p className="empty-state">Loading article...</p></main>;
  }

  if (!props.page) {
    return (
      <main className="wiki-document wiki-empty-document">
        <h1>Wiki repository</h1>
        <p>Create the first page and start building your own interview knowledge base.</p>
        <button className="primary-button compact-button" type="button" onClick={props.onCreateChild}>
          <ActionIcon label="Create first article" />Create first article
        </button>
      </main>
    );
  }

  return (
    <main className="wiki-document" aria-label="Wiki article">
      <article className="wiki-article">
        <header className="wiki-article-titlebar">
          <div>
            <span className="wiki-path">{props.page.path}</span>
            <h1>{props.page.title}</h1>
          </div>
          <div className="wiki-article-actions">
            {hasKnowledgeChecks ? (
              <button type="button" className="secondary-button compact-button wiki-study-link" onClick={props.onStudy}>
                <ActionIcon label="Study builder" />Study builder
              </button>
            ) : null}
            <button className="secondary-button compact-button" type="button" onClick={props.onCreateChild}>
              <ActionIcon label="Add subtopic" />Add subtopic
            </button>
            <button className="secondary-button compact-button" type="button" onClick={props.onDownloadPdf}>
              <ActionIcon label="Download PDF" />Download PDF
            </button>
            <button className="primary-button compact-button" type="button" onClick={props.onEdit}>
              <ActionIcon label="Edit source" />Edit source
            </button>
            <button className="secondary-button compact-button" type="button" onClick={props.onEditJson}><FileJson size={16} /> Edit JSON</button>
          </div>
        </header>

        <div className="wiki-article-body-grid">
          <aside className="wiki-page-contents" aria-label="Article contents">
            <strong>On this page</strong>
            {props.renderedMarkdown.headings.length ? (
              <nav tabIndex={0}>
                {props.renderedMarkdown.headings.map((heading) => (
                  <a className={`level-${heading.level}`} href={`#${heading.id}`} key={heading.id} aria-current={activeHeading === heading.id ? "location" : undefined} onClick={() => setActiveHeading(heading.id)}>
                    {heading.text}
                  </a>
                ))}
              </nav>
            ) : (
              <span>No headings</span>
            )}
            <a href="#wiki-knowledge-checks">Knowledge checks</a>
            <button className="text-button" type="button" onClick={props.onStudy}><ActionIcon label="Study this topic tree" />Study this topic tree</button>
          </aside>

          <div className="wiki-article-content official-wiki-content">
            {shouldRenderSummaryLead(props.page) ? <p className="wiki-lead">{props.page.summary}</p> : null}
            {props.renderedMarkdown.nodes.length ? props.renderedMarkdown.nodes : <p className="empty-state">This article is empty.</p>}

            <WikiSourceList sources={props.page.sources} />
            <WikiProgressSummary progress={props.progress} />
            <WikiBranchProgress topics={props.branchProgress} rootId={props.page.id} />
            <WikiPracticeInserts page={props.page} />

            {props.childNodes.length ? (
              <section className="wiki-related-pages" aria-labelledby="subtopics-title">
                <h2 id="subtopics-title">Subtopics</h2>
                <div>
                  {props.childNodes.map((child) => (
                    <button key={child.id} type="button" onClick={() => props.onOpenChild(child.id)}>
                      {child.title}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="wiki-infobox" aria-label="Article metadata">
            <strong>{props.page.title}</strong>
            <dl>
              <div>
                <dt>Updated</dt>
                <dd>{formatDateTime(props.page.updatedAt)}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(props.page.createdAt)}</dd>
              </div>
              <div>
                <dt>Subtopics</dt>
                <dd>{props.page.childCount}</dd>
              </div>
              <div>
                <dt>Sources</dt>
                <dd>{props.page.sources.length}</dd>
              </div>
              <div>
                <dt>Checks</dt>
                <dd>{props.page.quizQuestions.length + props.page.flashcards.length}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{props.page.isArchived ? "Archived" : "Active"}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </article>
    </main>
  );
}

function WikiSourceList(props: { sources: WikiPageRecord["sources"] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!props.sources.length) {
    return null;
  }

  const visibleSources = isExpanded ? props.sources : props.sources.slice(0, 3);

  return (
    <section className="wiki-source-list" aria-label="Article sources">
      <div className="wiki-source-list-heading">
        <div>
          <span>Sources</span>
          <h2>Where this comes from</h2>
        </div>
        {props.sources.length > 3 ? (
          <button className="secondary-button compact-button" type="button" onClick={() => setIsExpanded((current) => !current)}>
            {isExpanded ? "Show less" : `Show all ${props.sources.length}`}
          </button>
        ) : null}
      </div>
      <div className="wiki-source-list-grid">
        {visibleSources.map((source) => (
          <article className="wiki-source-card" key={source.id}>
            <span>{source.type || "Source"}</span>
            <h3>{source.url ? <a href={source.url} rel="noreferrer" target="_blank">{source.title}</a> : source.title}</h3>
            <dl>
              {source.author ? (
                <div>
                  <dt>Author</dt>
                  <dd>{source.author}</dd>
                </div>
              ) : null}
              {source.locator ? (
                <div>
                  <dt>Locator</dt>
                  <dd>{source.locator}</dd>
                </div>
              ) : null}
            </dl>
            {source.notes ? <p>{source.notes}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function WikiStudyBuilder(props: { currentPage: WikiPageRecord; treeNodes: WikiTreeNode[] }) {
  const nestedTree = useMemo(() => buildNestedTree(props.treeNodes), [props.treeNodes]);
  const orderedTopicIds = useMemo(() => flattenNestedWikiTree(nestedTree).map(node => node.id), [nestedTree]);
  const [scope, setScope] = useState<WikiStudyScope>("branch");
  const [mode, setMode] = useState<WikiStudyMode>("both");
  const [order, setOrder] = useState<WikiStudyOrder>("page-order");
  const [amount, setAmount] = useState<WikiStudyAmount>("all");
  const [limit, setLimit] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(collectSubtreeIds(props.treeNodes, props.currentPage.id)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<WikiStudyItem[]>([]);
  const [topicSearch, setTopicSearch] = useState("");

  useEffect(() => {
    setScope("branch");
    setSelectedIds(new Set(collectSubtreeIds(props.treeNodes, props.currentPage.id)));
    setItems([]);
  }, [props.currentPage.id]);

  function selectScope(value: WikiStudyScope) {
    setScope(value);
    setSelectedIds(new Set(value === "all" ? orderedTopicIds : value === "current" ? [props.currentPage.id] : collectSubtreeIds(props.treeNodes, props.currentPage.id)));
  }
  function toggleTopic(id: string) {
    const ids = collectSubtreeIds(props.treeNodes, id);
    setSelectedIds(current => {
      const next = new Set(current);
      const add = ids.some(topic => !next.has(topic));
      ids.forEach(topic => add ? next.add(topic) : next.delete(topic));
      return next;
    });
    setScope("custom");
  }
  async function startSession(random = order === "random", itemLimit = amount === "limited" ? limit : null) {
    setLoading(true); setError(null);
    try {
      const ids = orderedTopicIds.filter(id => selectedIds.has(id));
      if (!ids.length) throw new Error("Select at least one topic.");
      const pages: WikiPageRecord[] = [];
      // Bound concurrent requests even for a large repository.
      for (let offset = 0; offset < ids.length; offset += 8) {
        pages.push(...await Promise.all(ids.slice(offset, offset + 8).map(id =>
          id === props.currentPage.id ? Promise.resolve(props.currentPage) : getWikiPage(id))));
      }
      const activePages = pages.filter(page => !page.isArchived);
      const checks = studyItems(activePages, mode);
      const next = random ? shuffleArray(checks) : checks;
      const selection = itemLimit === null ? next : next.slice(0, Math.max(1, itemLimit));
      if (!selection.length) throw new Error("No active quiz questions or flashcards in these topics.");
      setItems(selection);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to prepare this session."); }
    finally { setLoading(false); }
  }
  if (items.length) return <WikiLearningPlayer key={items.map(i => i.id).join("-")} items={items} onClose={() => setItems([])} />;
  return <section className="wiki-study-builder" id="wiki-study-builder" aria-label="Wiki study builder">
    <header className="wiki-study-builder-header"><div><span className="wiki-practice-kicker">Study builder</span><h2>Choose your topics</h2></div><span>{selectedIds.size} selected</span></header>
    <div className="wiki-study-presets">
      <button className="secondary-button" type="button" disabled={loading} onClick={() => void startSession(true, 10)}><ActionIcon label="Random 10" />Random 10</button>
      <button className="secondary-button" type="button" disabled={loading} onClick={() => void startSession(true, 25)}><ActionIcon label="Random 25" />Random 25</button>
      <button className="secondary-button" type="button" disabled={loading} onClick={() => void startSession(false, null)}>All in order</button>
    </div>
    <div className="wiki-study-builder-grid">
      <div className="wiki-study-builder-panel">
        <div className="wiki-study-control-group"><span>Topics</span><div className="wiki-study-segmented">
          {(["current", "branch", "all"] as WikiStudyScope[]).map(value => <button type="button" key={value} disabled={loading} className={scope === value ? "active" : ""} onClick={() => selectScope(value)}>{value === "current" ? "This page" : value === "branch" ? "This branch" : "All Wiki"}</button>)}
        </div></div>
        <div className="wiki-study-control-group"><span>Practice</span><div className="wiki-study-segmented">
          {(["quiz","flashcards","both"] as WikiStudyMode[]).map(value => <button type="button" key={value} disabled={loading} className={mode === value ? "active" : ""} onClick={() => setMode(value)}>{value === "quiz" ? "Quiz" : value === "flashcards" ? "Flashcards" : "Both"}</button>)}
        </div></div>
        <label>Order<select value={order} disabled={loading} onChange={event => setOrder(event.target.value as WikiStudyOrder)}><option value="page-order">Page order</option><option value="random">Random</option></select></label>
        <label>Amount<select value={amount} disabled={loading} onChange={event => setAmount(event.target.value as WikiStudyAmount)}><option value="all">All selected checks</option><option value="limited">Limited sample</option></select></label>
        {amount === "limited" ? <label>Number of checks<input type="number" min={1} max={5000} value={limit} onChange={event => setLimit(Math.max(1, Number(event.target.value) || 1))} /></label> : null}
        <button className="primary-button" type="button" disabled={loading} onClick={() => void startSession()}>{loading ? "Preparing..." : "Start session"}</button>
        {error ? <p className="error-banner" role="alert">{error}</p> : null}
      </div>
      <div className="wiki-study-builder-panel">
        <div className="wiki-study-topic-heading"><strong>{scope === "custom" ? "Custom selection" : "Topic tree"}</strong><button type="button" className="text-button" disabled={loading} onClick={() => { setSelectedIds(new Set()); setScope("custom"); }}><ActionIcon label="Clear" />Clear</button></div>
        <label>Find a topic<input value={topicSearch} onChange={event => setTopicSearch(event.target.value)} /></label>
        <div className="wiki-study-tree">{topicSearch ? props.treeNodes.filter(n => n.title.toLowerCase().includes(topicSearch.toLowerCase()) || n.path.toLowerCase().includes(topicSearch.toLowerCase())).map(node =>
          <label className="wiki-study-topic-row" key={node.id}><input type="checkbox" checked={selectedIds.has(node.id)} onChange={() => toggleTopic(node.id)} /><span>{node.title}</span><small>{node.path}</small></label>)
          : nestedTree.map(node => <WikiStudyTopicNode key={node.id} node={node} selectedIds={selectedIds} onToggle={toggleTopic} />)}</div>
      </div>
    </div>
  </section>;
}

function WikiStudyTopicNode(props: { node: NestedWikiTreeNode; selectedIds: Set<string>; onToggle: (id: string) => void }) {
  return <div className="wiki-study-topic-node">
    <label className={props.selectedIds.has(props.node.id) ? "wiki-study-topic-row selected" : "wiki-study-topic-row"}>
      <input type="checkbox" checked={props.selectedIds.has(props.node.id)} onChange={() => props.onToggle(props.node.id)} />
      <span>{props.node.title}</span><small>{props.node.children.length ? `${props.node.children.length} subtopics` : "Article"}</small>
    </label>
    {props.node.children.length ? <details className="wiki-study-topic-children" open><summary>Subtopics</summary>{props.node.children.map(child => <WikiStudyTopicNode key={child.id} node={child} selectedIds={props.selectedIds} onToggle={props.onToggle} />)}</details> : null}
  </div>;
}

function WikiExplore(props: {
  progress: WikiStudyPageProgress[];
  pages: WikiPageRecord[];
  selectedPageId: string | null;
  search: string;
  sort: WikiSort;
  includeArchived: boolean;
  isLoading: boolean;
  page: number;
  totalPages: number;
  totalCount: number;
  onCreate: () => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: WikiSort) => void;
  onIncludeArchivedChange: (value: boolean) => void;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <main className="wiki-document wiki-explore-view" aria-label="Wiki dashboard">
      <header className="wiki-special-header">
        <div>
          <span>Special page</span>
          <h1>Search repository</h1>
        </div>
        <button className="primary-button compact-button" type="button" onClick={props.onCreate}>
          <ActionIcon label="New article" />New article
        </button>
      </header>

      <div className="wiki-search-strip">
        <label>
          Search all text
          <input
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            placeholder="algorithm, redis, graph, transactions..."
          />
        </label>
        <label>
          Sort
          <select value={props.sort} onChange={(event) => props.onSortChange(event.target.value as WikiSort)}>
            <option value="updated-newest">Updated newest</option>
            <option value="updated-oldest">Updated oldest</option>
            <option value="title">Title</option>
            <option value="tree">Tree path</option>
          </select>
        </label>
        <label className="inline-checkbox">
          <input
            checked={props.includeArchived}
            type="checkbox"
            onChange={(event) => props.onIncludeArchivedChange(event.target.checked)}
          />
          Include archived
        </label>
      </div>

      {props.isLoading ? (
        <p className="empty-state">Loading repository...</p>
      ) : props.pages.length ? (
        <ol className="wiki-search-results">
          {props.pages.map((wikiPage) => (
            <li key={wikiPage.id}>
              <button
                className={props.selectedPageId === wikiPage.id ? "active" : ""}
                type="button"
                onClick={() => props.onSelect(wikiPage.id)}
              >
                <strong>{wikiPage.title}</strong>
                <span>{wikiPage.summary || wikiPage.contentMarkdown.slice(0, 180) || "No summary yet."}</span>
                {wikiPage.sources.length ? (
                  <div className="wiki-result-sources" aria-label="Sources">
                    {wikiPage.sources.slice(0, 3).map((source) => (
                      <span key={source.id}>
                        {source.title}{source.locator ? ` · ${source.locator}` : ""}
                      </span>
                    ))}
                    {wikiPage.sources.length > 3 ? <span>+{wikiPage.sources.length - 3} more</span> : null}
                  </div>
                ) : null}
                <small>
                  {wikiPage.path} · {wikiPage.childCount} subtopics · updated {formatDateTime(wikiPage.updatedAt)}
                </small>
                <WikiProgressSummary progress={props.progress.find(p => p.id === wikiPage.id)} />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty-state">No wiki pages match this search.</p>
      )}

      <div className="pagination-row">
        <button
          className="secondary-button compact-button"
          type="button"
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(Math.max(1, props.page - 1))}
        >
          <ActionIcon label="Previous" />Previous
        </button>
        <span>
          Page {props.page} / {props.totalPages} · {props.totalCount} articles
        </span>
        <button
          className="secondary-button compact-button"
          type="button"
          disabled={props.page >= props.totalPages}
          onClick={() => props.onPageChange(Math.min(props.totalPages, props.page + 1))}
        >
          <ActionIcon label="Next" />Next
        </button>
      </div>
    </main>
  );
}

function WikiPracticeInserts(props: { page: WikiPageRecord }) {
  const [mode, setMode] = useState<"quiz" | "flashcards" | "both" | null>(null);
  useEffect(() => { setMode(null); }, [props.page.id]);
  if (!props.page.quizQuestions.length && !props.page.flashcards.length) return null;
  return <section className="wiki-practice-inserts" id="wiki-knowledge-checks" aria-label="Knowledge checks">
    <header className="wiki-practice-header"><div><span className="wiki-practice-kicker">Practice</span><h2>Knowledge checks</h2></div></header>
    {mode ? <WikiLearningPlayer key={props.page.id + mode} items={studyItems([props.page], mode)} onClose={() => setMode(null)} /> :
      <div className="wiki-study-menu">
        {props.page.quizQuestions.length ? <button type="button" className="wiki-study-mode-card" onClick={() => setMode("quiz")}><span>Quiz</span><strong>{props.page.quizQuestions.length} questions</strong></button> : null}
        {props.page.flashcards.length ? <button type="button" className="wiki-study-mode-card" onClick={() => setMode("flashcards")}><span>Flashcards</span><strong>{props.page.flashcards.length} cards</strong></button> : null}
        {props.page.quizQuestions.length && props.page.flashcards.length ? <button type="button" className="wiki-study-mode-card" onClick={() => setMode("both")}><span>Combined</span><strong>All checks</strong></button> : null}
      </div>}
  </section>;
}

function WikiEditor(props: {
  form: WikiForm;
  editingPageId: string | null;
  selectedPage: WikiPageRecord | null;
  treeNodes: WikiTreeNode[];
  descendantIds: Set<string>;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: <K extends keyof WikiForm>(key: K, value: WikiForm[K]) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [imageUploadStatus, setImageUploadStatus] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [snippetLanguage, setSnippetLanguage] = useState("csharp");
  const preview = useMemo(() => renderMarkdown(props.form.contentMarkdown, undefined, false), [props.form.contentMarkdown]);

  const scrollSync = useWikiScrollSync(sourceTextareaRef, previewRef, props.form.contentMarkdown);

  function insertSnippet(snippet: string, fallbackSelection = "") {
    const textarea = sourceTextareaRef.current;
    insertSnippetAt(snippet, textarea?.selectionStart, textarea?.selectionEnd, fallbackSelection);
  }

  function insertSnippetAt(
    snippet: string,
    selectionStart = props.form.contentMarkdown.length,
    selectionEnd = props.form.contentMarkdown.length,
    fallbackSelection = ""
  ) {
    const insertion = insertMarkdownSnippet(
      props.form.contentMarkdown,
      snippet,
      selectionStart,
      selectionEnd,
      fallbackSelection
    );

    props.onUpdate("contentMarkdown", insertion.value);

    requestAnimationFrame(() => {
      sourceTextareaRef.current?.focus();
      sourceTextareaRef.current?.setSelectionRange(insertion.selectionStart, insertion.selectionEnd);
    });
  }

  async function insertImageFile(file: File, selectionStart?: number, selectionEnd?: number) {
    if (!file.type.startsWith("image/")) {
      setImageUploadStatus("Choose an image file.");
      return;
    }

    setIsUploadingImage(true);
    setImageUploadStatus(null);

    try {
      const image = await uploadWikiImage(file);
      insertSnippetAt(image.markdownSnippet, selectionStart, selectionEnd);
      setImageUploadStatus(`Added ${image.fileName}.`);
    } catch (requestError) {
      setImageUploadStatus(requestError instanceof Error ? requestError.message : "Unable to upload image.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const textarea = sourceTextareaRef.current;
    void insertImageFile(file, textarea?.selectionStart, textarea?.selectionEnd);
  }

  function handleSourcePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const imageFile = findClipboardImage(event);

    if (!imageFile) {
      const html = event.clipboardData.getData("text/html");
      const text = event.clipboardData.getData("text/plain").trim();
      const source = html ? new DOMParser().parseFromString(html, "text/html").querySelector("img")?.getAttribute("src") : null;
      const url = source ?? (/^https?:\/\/\S+\.(png|jpe?g|webp|gif)(\?\S*)?$/i.test(text) ? text : null);
      if (url && /^(https?:|data:image\/)/i.test(url)) {
        event.preventDefault();
        void insertImageUrl(url, event.currentTarget.selectionStart, event.currentTarget.selectionEnd);
      }
      return;
    }

    event.preventDefault();
    void insertImageFile(imageFile, event.currentTarget.selectionStart, event.currentTarget.selectionEnd);
  }

  async function insertImageUrl(url: string, start?: number, end?: number) {
    setIsUploadingImage(true); setImageUploadStatus(null);
    try {
      if (url.startsWith("data:image/")) {
        const blob = await (await fetch(url)).blob();
        await insertImageFile(new File([blob], "pasted-image.png", { type: blob.type }), start, end);
      } else {
        const image = await importWikiImageUrl(url);
        insertSnippetAt(image.markdownSnippet, start, end);
        setImageUploadStatus("Image saved locally.");
      }
    } catch (failure) { setImageUploadStatus(failure instanceof Error ? failure.message : "Unable to copy this image. Try uploading the file."); }
    finally { setIsUploadingImage(false); }
  }

  return (
    <main className="wiki-document wiki-edit-view" aria-label="Wiki editor">
      <form onSubmit={props.onSubmit}>
        <header className="wiki-special-header">
          <div>
            <span>{props.editingPageId ? "Source editor" : "Create article"}</span>
            <h1>{props.editingPageId ? props.selectedPage?.title : "New wiki article"}</h1>
          </div>
          <div className="wiki-article-actions">
            <button className="secondary-button compact-button" type="button" onClick={props.onCancel}>
              <ActionIcon label="Cancel" />Cancel
            </button>
            <button className="primary-button compact-button" type="submit" disabled={props.isSaving}>
              {props.isSaving ? "Saving..." : "Save article"}
            </button>
          </div>
        </header>

        <details className="wiki-article-details" open={!props.editingPageId}>
        <summary>Article details</summary>
        <div className="wiki-edit-metadata">
          <label>
            Parent topic
            <select value={props.form.parentId} onChange={(event) => props.onUpdate("parentId", event.target.value)}>
              <option value="">Root topic</option>
              {props.treeNodes
                .filter((node) => node.id !== props.editingPageId && !props.descendantIds.has(node.id))
                .map((node) => (
                  <option key={node.id} value={node.id}>
                    {`${"\u00A0\u00A0".repeat(node.depth)}${node.title}`}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Sort order
            <input
              min={0}
              type="number"
              value={props.form.sortOrder}
              onChange={(event) => props.onUpdate("sortOrder", Number(event.target.value))}
            />
          </label>
          <label>
            Title
            <input value={props.form.title} onChange={(event) => props.onUpdate("title", event.target.value)} />
          </label>
          <label>
            Slug
            <input value={props.form.slug} onChange={(event) => props.onUpdate("slug", event.target.value)} placeholder="auto-generated" />
          </label>
        </div>

        <label className="wiki-wide-label">
          Summary
          <textarea
            className="compact-textarea"
            value={props.form.summary}
            onChange={(event) => props.onUpdate("summary", event.target.value)}
            placeholder="Short definition or mental model."
          />
        </label>

        </details>

        <section className="wiki-editor-section">
          <h2>Article source</h2>
          <div className="wiki-editor-workspace">
            <section className="wiki-source-panel" aria-label="Markdown source editor">
              <div className="wiki-markdown-toolbar" aria-label="Markdown helpers">
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet("## {{selection}}\n\nWrite the core idea here.", "New section")}>
                  Heading
                </button>
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet("### {{selection}}\n\nAdd a focused detail here.", "Subsection")}>
                  Subheading
                </button>
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet("- Key point\n- Important edge case\n- Interview signal")}>
                  List
                </button>
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet("[{{selection}}](wiki-slug-or-url)", "Related article")}>
                  Link
                </button>
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet("> {{selection}}", "Short definition or quote.")}>
                  Quote
                </button>
                <select className="wiki-code-language-picker" aria-label="Code snippet language" value={snippetLanguage} onChange={event => setSnippetLanguage(event.target.value)}>
                  {codeLanguages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet("```" + snippetLanguage + "\n{{selection}}\n```", snippetLanguage === "python" || snippetLanguage === "yaml" || snippetLanguage === "bash" ? "# Paste code here" : "// Paste code here")}>
                  Code
                </button>
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet("```mermaid\nflowchart LR\n    Publisher --> Event[Event / delegate contract]\n    Event --> SubscriberA[Subscriber A]\n    Event --> SubscriberB[Subscriber B]\n```", "")}>
                  <Workflow size={15} aria-hidden="true" />Diagram
                </button>
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet("| Topic | Notes |\n| --- | --- |\n|  |  |")}>
                  Table
                </button>
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet(wikiLearningContainer("tip", "Key point", "{{selection}}"), "Explain the important idea.")}>
                  Note
                </button>
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet(wikiLearningContainer("definition", "{{selection}}", "Explain the term and give an example."), "Term")}>
                  Definition
                </button>
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet(wikiLearningContainer("important", "Active recall", "{{selection}}\n\n" + wikiLearningContainer("details", "Reveal answer", "Write the answer and reasoning here.")), "Ask a self-contained question.")}>
                  Recall
                </button>
                <label className="secondary-button compact-button file-action-button wiki-image-action" title="Add image">
                  {isUploadingImage ? "Uploading..." : "Image"}
                  <input
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={isUploadingImage}
                    type="file"
                    onChange={handleImageFileChange}
                  />
                </label>
              </div>
              {imageUploadStatus ? <p className="wiki-image-upload-status" aria-live="polite">{imageUploadStatus}</p> : null}
              <textarea
                aria-label="Article source"
                ref={sourceTextareaRef}
                className="wiki-source-textarea"
                value={props.form.contentMarkdown}
                onChange={(event) => props.onUpdate("contentMarkdown", event.target.value)}
                onPaste={handleSourcePaste}
                onScroll={scrollSync.onSourceScroll}
                placeholder="Use headings, bullet points, comparison tables, code snippets and links."
              />
            </section>
            <aside className="wiki-editor-preview" aria-label="Markdown preview">
              <div className="wiki-preview-heading">
                <span>Live preview</span>
                <strong>{props.form.title || "Untitled article"}</strong>
              </div>
              <div className="official-wiki-content wiki-preview-scroll" ref={previewRef} onScroll={scrollSync.onPreviewScroll}>
                {props.form.summary.trim() ? <p className="wiki-lead">{props.form.summary}</p> : null}
                {preview.nodes.length ? preview.nodes : <p className="empty-state">Nothing to preview yet.</p>}
              </div>
            </aside>
          </div>
        </section>

        <section className="wiki-practice-editor wiki-sources-editor" aria-label="Article sources">
          <header>
            <div>
              <span>Loose sources</span>
              <h2>Books, articles, courses, notes</h2>
            </div>
          </header>
          <div className="wiki-practice-editor-grid">
            <label>
              Sources JSON
              <textarea
                className="wiki-insert-json-textarea"
                value={props.form.sourcesJson}
                onChange={(event) => props.onUpdate("sourcesJson", event.target.value)}
                placeholder={sampleWikiSourcesJson}
              />
              <button className="secondary-button compact-button" type="button" onClick={() => props.onUpdate("sourcesJson", sampleWikiSourcesJson)}>
                Use source sample
              </button>
            </label>
            <div className="wiki-editor-help-card">
              <span>Why sources are separate</span>
              <p>
                A topic can appear in many books or articles. Keep sources here so search can find pages by book,
                author, chapter, or loose notes without cluttering the article body.
              </p>
            </div>
          </div>
        </section>

        <section className="wiki-practice-editor" aria-label="Knowledge checks">
          <header>
            <div>
              <span>Optional inserts</span>
              <h2>Knowledge checks</h2>
            </div>
          </header>
          <div className="wiki-practice-editor-grid">
            <label>
              Quiz JSON
              <textarea
                className="wiki-insert-json-textarea"
                value={props.form.quizJson}
                onChange={(event) => props.onUpdate("quizJson", event.target.value)}
                placeholder={sampleWikiQuizJson}
              />
              <button className="secondary-button compact-button" type="button" onClick={() => props.onUpdate("quizJson", sampleWikiQuizJson)}>
                Use quiz sample
              </button>
            </label>
            <label>
              Flashcards JSON
              <textarea
                className="wiki-insert-json-textarea"
                value={props.form.flashcardsJson}
                onChange={(event) => props.onUpdate("flashcardsJson", event.target.value)}
                placeholder={sampleWikiFlashcardsJson}
              />
              <button className="secondary-button compact-button" type="button" onClick={() => props.onUpdate("flashcardsJson", sampleWikiFlashcardsJson)}>
                Use flashcard sample
              </button>
            </label>
          </div>
        </section>

        <footer className="wiki-edit-footer">
          <label className="inline-checkbox">
            <input
              checked={props.form.isArchived}
              type="checkbox"
              onChange={(event) => props.onUpdate("isArchived", event.target.checked)}
            />
            Archive article
          </label>
          {props.editingPageId ? (
            <button className="danger-button" type="button" onClick={props.onDelete} disabled={props.isSaving}>
              <ActionIcon label="Delete article and subtopics" />Delete article and subtopics
            </button>
          ) : null}
        </footer>
      </form>
    </main>
  );
}

function WikiBatchImport(props: {
  treeNodes: WikiTreeNode[];
  parentId: string;
  batchJson: string;
  batchFileName: string | null;
  showImportStructure: boolean;
  isSaving: boolean;
  onBatchFileSelected: (file: File | null) => Promise<void>;
  onParentChange: (value: string) => void;
  onBatchJsonChange: (value: string) => void;
  onToggleImportStructure: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="wiki-document wiki-import-view" aria-label="Wiki batch import">
      <form onSubmit={props.onSubmit}>
        <header className="wiki-special-header">
          <div>
            <span>Special page</span>
            <h1>Batch import</h1>
          </div>
          <div className="wiki-import-actions">
            <label className="secondary-button file-action-button">
              Choose JSON
              <input
                accept="application/json,.json"
                disabled={props.isSaving}
                type="file"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  event.currentTarget.value = "";
                  void props.onBatchFileSelected(file);
                }}
              />
            </label>
            <button className="secondary-button compact-button" type="button" onClick={props.onToggleImportStructure}>
              <ActionIcon label="JSON structure" />JSON structure
            </button>
            <button className="primary-button compact-button" type="submit" disabled={props.isSaving}>
              {props.isSaving ? "Importing..." : "Import tree"}
            </button>
          </div>
        </header>

        <div className={props.showImportStructure ? "wiki-import-layout" : "wiki-import-layout without-reference"}>
          <section>
            <label>
              Import under
              <select value={props.parentId} onChange={(event) => props.onParentChange(event.target.value)}>
                <option value="">Root repository</option>
                {props.treeNodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {`${"\u00A0\u00A0".repeat(node.depth)}${node.title}`}
                  </option>
                ))}
              </select>
            </label>
            {props.batchFileName ? (
              <p className="wiki-import-file-note">Loaded file: {props.batchFileName}</p>
            ) : null}
              <label>
                JSON tree
                <span className="wiki-field-hint">
                contentMarkdown or structured sections: paragraphs, nested lists, steps, tables, code, definitions, checklist, learning blocks, quizQuestions, flashcards, sources, and children.
                </span>
              <textarea
                className="wiki-import-textarea"
                value={props.batchJson}
                onChange={(event) => props.onBatchJsonChange(event.target.value)}
              />
            </label>
          </section>

          {props.showImportStructure ? (
            <aside className="wiki-import-reference">
              <strong>JSON structure</strong>
              <pre>{sampleImport}</pre>
            </aside>
          ) : null}
        </div>
      </form>
    </main>
  );
}

function WikiTreeNodeView(props: {
  node: NestedWikiTreeNode;
  expandedIds: Set<string>;
  selectedPageId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const isExpanded = props.expandedIds.has(props.node.id);
  const hasChildren = props.node.children.length > 0;

  return (
    <li>
      <div className={props.selectedPageId === props.node.id ? "wiki-tree-row active" : "wiki-tree-row"}>
        <button
          aria-label={isExpanded ? "Collapse topic" : "Expand topic"}
          className="tree-toggle"
          disabled={!hasChildren}
          type="button"
          onClick={() => props.onToggle(props.node.id)}
        >
          {hasChildren ? (isExpanded ? "v" : ">") : ""}
        </button>
        <button className="tree-node-button" type="button" onClick={() => props.onSelect(props.node.id)}>
          <span>{props.node.title}</span>
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <ul>
          {props.node.children.map((child) => (
            <WikiTreeNodeView
              expandedIds={props.expandedIds}
              key={child.id}
              node={child}
              selectedPageId={props.selectedPageId}
              onSelect={props.onSelect}
              onToggle={props.onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function flattenNestedWikiTree(nodes: NestedWikiTreeNode[]) {
  const flattened: NestedWikiTreeNode[] = [];

  for (const node of nodes) {
    flattened.push(node);
    flattened.push(...flattenNestedWikiTree(node.children));
  }

  return flattened;
}

function filterTopicTree(nodes: NestedWikiTreeNode[], search: string): NestedWikiTreeNode[] {
  const query = search.trim().toLowerCase();
  if (!query) return nodes;
  return nodes.flatMap(node => {
    const children = filterTopicTree(node.children, query);
    return node.title.toLowerCase().includes(query) || node.path.toLowerCase().includes(query)
      ? [node] : children.length ? [{ ...node, children }] : [];
  });
}



function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function buildNestedTree(nodes: WikiTreeNode[]): NestedWikiTreeNode[] {
  const nodeMap = new Map<string, NestedWikiTreeNode>();

  for (const node of nodes) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  const roots: NestedWikiTreeNode[] = [];

  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: NestedWikiTreeNode[]) => {
    items.sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));
    items.forEach((item) => sortNodes(item.children));
  };

  sortNodes(roots);
  return roots;
}

function collectDescendantIds(nodes: WikiTreeNode[], pageId: string) {
  const childrenByParent = new Map<string, WikiTreeNode[]>();

  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }

    childrenByParent.set(node.parentId, [...(childrenByParent.get(node.parentId) ?? []), node]);
  }

  const ids = new Set<string>();
  const stack = [...(childrenByParent.get(pageId) ?? [])];

  while (stack.length > 0) {
    const node = stack.pop();

    if (!node) {
      continue;
    }

    ids.add(node.id);
    stack.push(...(childrenByParent.get(node.id) ?? []));
  }

  return ids;
}

function collectSubtreeIds(nodes: WikiTreeNode[], rootId: string) {
  const descendantIds = collectDescendantIds(nodes, rootId);
  const orderedDescendants = nodes
    .filter((node) => descendantIds.has(node.id))
    .sort((left, right) => left.path.localeCompare(right.path) || left.sortOrder - right.sortOrder)
    .map((node) => node.id);

  return [rootId, ...orderedDescendants];
}

async function openWikiPdfPrintWindow(title: string, pages: WikiPageRecord[]) {
  const printWindow = window.open("", "_blank", "width=1100,height=900");

  if (!printWindow) {
    throw new Error("Allow pop-ups to prepare the wiki PDF.");
  }

  printWindow.document.write(buildPrintableWikiDocument(title, pages));
  printWindow.document.close();
  printWindow.focus();
  await renderPrintableDiagrams(printWindow.document);
  await printWindow.document.fonts.ready;
  await Promise.all(Array.from(printWindow.document.images, image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
    image.onload = () => resolve(); image.onerror = () => resolve(); setTimeout(resolve, 5000);
  })));
  if (!printWindow.closed) printWindow.print();
}

function buildPrintableWikiDocument(title: string, pages: WikiPageRecord[]) {
  const articleHtml = pages.map((page, index) => `
    <article class="print-article">
      ${index > 0 ? '<div class="page-break"></div>' : ""}
      <p class="path">${escapeHtml(page.path)}</p>
      <h1>${escapeHtml(page.title)}</h1>
      ${page.summary ? `<p class="lead">${escapeHtml(page.summary)}</p>` : ""}
      ${renderWikiMarkdownHtml(page.contentMarkdown, true).html}
      ${renderWikiSourcesToHtml(page)}
      ${renderWikiPracticeInsertsToHtml(page)}
    </article>
  `).join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - Repetitio Wiki</title>
  <style>
    body { margin: 0; color: #202122; background: #fff; font: 12pt/1.55 Georgia, 'Times New Roman', serif; }
    main { max-width: 860px; margin: 0 auto; padding: 32px 42px; }
    h1 { margin: 0 0 10px; border-bottom: 1px solid #a2a9b1; font-size: 28pt; font-weight: 400; }
    h2, h3, h4, h5 { border-bottom: 1px solid #a2a9b1; margin: 24px 0 8px; padding-bottom: 3px; font-weight: 400; }
    p { margin: 0 0 12px; }
    .path { color: #54595d; font: 9pt/1.3 Arial, sans-serif; }
    .lead { font-size: 13pt; }
    img { display: block; max-width: 100%; height: auto; margin: 14px auto; border: 1px solid #a2a9b1; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-family: Arial, sans-serif; font-size: 10pt; }
    th, td { border: 1px solid #a2a9b1; padding: 6px 8px; vertical-align: top; }
    th { background: #eaecf0; text-align: left; }
    pre { overflow-wrap: anywhere; white-space: pre-wrap; border: 1px solid #a2a9b1; padding: 10px; background: #f8f9fa; }
    code { font-family: Consolas, monospace; font-size: 10pt; }
    blockquote { margin: 12px 0; border-left: 4px solid #a2a9b1; padding: 8px 12px; background: #f8f9fa; }
    .wiki-learning-block { margin: 16px 0; padding: 12px 16px; border-left: 4px solid #305eab; background: #f6f7f9; }
    .wiki-learning-label { display: block; margin-bottom: 8px; }
    .wiki-learning-pitfall, .wiki-learning-warning { border-left-color: #b33f36; }
    .wiki-definition { margin: 14px 0; } .wiki-definition dt { font-weight: 700; } .wiki-definition dd { margin: 4px 0 0 16px; }
    .wiki-reveal { margin: 12px 0; border-block: 1px solid #c8cdd3; padding: 10px 0; }
    .wiki-reveal summary { font-weight: 700; margin-bottom: 8px; }
    .wiki-code-toolbar { font: 9pt Arial, sans-serif; color: #54595d; margin-bottom: 6px; }
    .wiki-code-actions { display: none; }
    .wiki-diagram-preview svg { max-width: 100%; height: auto; }
    .wiki-table-toolbar { display: none; }
    .checks { margin-top: 24px; border-top: 1px solid #a2a9b1; padding-top: 12px; }
    .sources { margin-top: 20px; border-top: 1px solid #a2a9b1; padding-top: 12px; }
    .source-card { break-inside: avoid; border: 1px solid #a2a9b1; margin: 8px 0; padding: 8px 10px; font-family: Arial, sans-serif; font-size: 10pt; }
    .source-card strong { display: block; margin-bottom: 4px; }
    .source-card p { margin: 4px 0 0; }
    .check-card { break-inside: avoid; border: 1px solid #a2a9b1; margin: 10px 0; padding: 10px 12px; }
    .check-card strong { display: block; margin-bottom: 6px; }
    .correct { font-weight: 700; }
    .page-break { break-before: page; }
  </style>
</head>
<body>
  <main>${articleHtml}</main>
</body>
</html>`;
}

function renderWikiPracticeInsertsToHtml(page: WikiPageRecord) {
  if (page.quizQuestions.length === 0 && page.flashcards.length === 0) {
    return "";
  }

  const quizHtml = page.quizQuestions.map((question, index) => `
    <div class="check-card">
      <strong>Question ${index + 1}: ${escapeHtml(question.prompt)}</strong>
      <ol type="A">
        ${question.options.map((option) => `<li class="${option.isCorrect ? "correct" : ""}">${escapeHtml(option.text)}</li>`).join("")}
      </ol>
      ${question.explanation ? `<p>${escapeHtml(question.explanation)}</p>` : ""}
    </div>
  `).join("");
  const flashcardHtml = page.flashcards.map((flashcard) => `
    <div class="check-card">
      <strong>${escapeHtml(flashcard.front)}</strong>
      <p>${escapeHtml(flashcard.back)}</p>
    </div>
  `).join("");

  return `<section class="checks"><h2>Knowledge checks</h2>${quizHtml}${flashcardHtml}</section>`;
}

function renderWikiSourcesToHtml(page: WikiPageRecord) {
  if (!page.sources.length) {
    return "";
  }

  const sourcesHtml = page.sources.map((source) => {
    const details = [
      source.type,
      source.author,
      source.locator
    ].filter(Boolean).map((value) => escapeHtml(value ?? "")).join(" · ");

    return `<div class="source-card"><strong>${escapeHtml(source.title)}</strong>${details ? `<span>${details}</span>` : ""}${source.url ? `<p>${escapeHtml(source.url)}</p>` : ""}${source.notes ? `<p>${escapeHtml(source.notes)}</p>` : ""}</div>`;
  }).join("");

  return `<section class="sources"><h2>Sources</h2>${sourcesHtml}</section>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createWikiForm(page: WikiPageRecord): WikiForm {
  return {
    parentId: page.parentId ?? "",
    title: page.title,
    slug: page.slug,
    summary: page.summary ?? "",
    contentMarkdown: page.contentMarkdown,
    sourcesJson: JSON.stringify(toWikiSourceRequests(page.sources), null, 2),
    quizJson: JSON.stringify(toWikiQuizQuestionRequests(page.quizQuestions), null, 2),
    flashcardsJson: JSON.stringify(toWikiFlashcardRequests(page.flashcards), null, 2),
    sortOrder: page.sortOrder,
    isArchived: page.isArchived
  };
}

function toCreateWikiPageRequest(form: WikiForm): CreateWikiPageRequest {
  return {
    parentId: form.parentId || null,
    title: form.title.trim(),
    slug: form.slug.trim() || undefined,
    summary: form.summary.trim() || undefined,
    contentMarkdown: form.contentMarkdown,
    sources: parseWikiSourcesJson(form.sourcesJson),
    quizQuestions: parseWikiQuizJson(form.quizJson),
    flashcards: parseWikiFlashcardJson(form.flashcardsJson)
  };
}

function toWikiSourceRequests(sources: WikiPageRecord["sources"]): WikiSourceRequest[] {
  return sources.map((source) => ({
    title: source.title,
    type: source.type ?? undefined,
    author: source.author ?? undefined,
    url: source.url ?? undefined,
    locator: source.locator ?? undefined,
    notes: source.notes ?? undefined
  }));
}

function toWikiQuizQuestionRequests(questions: WikiPageRecord["quizQuestions"]): WikiQuizQuestionRequest[] {
  return questions.map((question) => ({
    prompt: question.prompt,
    explanation: question.explanation ?? undefined,
    options: question.options.map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect
    }))
  }));
}

function toWikiFlashcardRequests(flashcards: WikiPageRecord["flashcards"]): WikiFlashcardRequest[] {
  return flashcards.map((flashcard) => ({
    front: flashcard.front,
    back: flashcard.back
  }));
}

interface MarkdownInsertion {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

function insertMarkdownSnippet(
  markdown: string,
  snippet: string,
  selectionStart: number,
  selectionEnd: number,
  fallbackSelection = ""
): MarkdownInsertion {
  const boundedStart = Math.max(0, Math.min(selectionStart, markdown.length));
  const boundedEnd = Math.max(boundedStart, Math.min(selectionEnd, markdown.length));
  const selectedText = markdown.slice(boundedStart, boundedEnd).trim();
  const insertedFocusText = selectedText || fallbackSelection;
  const snippetText = snippet.includes("{{selection}}")
    ? snippet.split("{{selection}}").join(insertedFocusText)
    : snippet;
  const before = markdown.slice(0, boundedStart).replace(/\s+$/g, "");
  const after = markdown.slice(boundedEnd).replace(/^\s+/g, "");
  const prefix = before ? `${before}\n\n` : "";
  const suffix = after ? `\n\n${after}` : "\n";
  const value = `${prefix}${snippetText}${suffix}`;
  const focusIndex = insertedFocusText ? snippetText.indexOf(insertedFocusText) : -1;
  const cursorStart = focusIndex >= 0 ? prefix.length + focusIndex : prefix.length + snippetText.length;
  const cursorEnd = focusIndex >= 0 ? cursorStart + insertedFocusText.length : cursorStart;

  return {
    value,
    selectionStart: cursorStart,
    selectionEnd: cursorEnd
  };
}

function findClipboardImage(event: ClipboardEvent<HTMLTextAreaElement>) {
  const items = Array.from(event.clipboardData.items ?? []);

  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }

  return Array.from(event.clipboardData.files ?? []).find((file) => file.type.startsWith("image/")) ?? null;
}

function shouldRenderSummaryLead(page: WikiPageRecord) {
  const summary = page.summary?.trim();

  if (!summary) {
    return false;
  }

  return !page.contentMarkdown.trim().startsWith(summary);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
