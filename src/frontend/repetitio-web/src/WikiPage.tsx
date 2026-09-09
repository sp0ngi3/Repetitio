import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  createWikiPage,
  deleteWikiPage,
  getWikiPage,
  getWikiPages,
  getWikiTree,
  importWikiPages,
  updateWikiPage
} from "./api";
import type {
  CreateWikiPageRequest,
  ImportWikiPageNodeRequest,
  WikiPage as WikiPageRecord,
  WikiTreeNode
} from "./types";

type WikiView = "article" | "explore" | "edit" | "import";
type WikiSort = "updated-newest" | "updated-oldest" | "title" | "tree";

interface WikiForm {
  parentId: string;
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
  sortOrder: number;
  isArchived: boolean;
}

interface NestedWikiTreeNode extends WikiTreeNode {
  children: NestedWikiTreeNode[];
}

interface MarkdownHeading {
  id: string;
  level: number;
  text: string;
}

interface WikiImportTable {
  headers?: string[];
  columns?: string[];
  rows?: Array<string[] | Record<string, unknown>>;
}

const wikiPageSize = 15;

const emptyWikiForm: WikiForm = {
  parentId: "",
  title: "",
  slug: "",
  summary: "",
  contentMarkdown: "## Definition\n\n\n## Key points\n\n- \n\n## Comparison\n\n| Topic | Notes |\n| --- | --- |\n|  |  |\n",
  sortOrder: 0,
  isArchived: false
};

const sampleImport = JSON.stringify(
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
              content: "public int Max(int[] nums)\\n{\\n    int best = nums[0];\\n    foreach (var value in nums)\\n    {\\n        best = Math.Max(best, value);\\n    }\\n    return best;\\n}"
            }
          }
        ],
        seeAlso: ["Data structures", "Time complexity", "Dynamic programming"],
        references: [
          {
            label: "Personal interview notes",
            url: "https://example.com/notes"
          }
        ],
        externalLinks: [
          {
            label: "Wikipedia-style article used as a layout reference",
            url: "https://pl.wikipedia.org/wiki/Algorytm"
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

export function WikiPage() {
  const [treeNodes, setTreeNodes] = useState<WikiTreeNode[]>([]);
  const [pages, setPages] = useState<WikiPageRecord[]>([]);
  const [selectedPage, setSelectedPage] = useState<WikiPageRecord | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<WikiView>("article");
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
  const descendantIds = useMemo(
    () => editingPageId ? collectDescendantIds(treeNodes, editingPageId) : new Set<string>(),
    [editingPageId, treeNodes]
  );
  const renderedMarkdown = useMemo(
    () => renderMarkdown(selectedPage?.contentMarkdown ?? ""),
    [selectedPage?.contentMarkdown]
  );
  const articleChildren = useMemo(
    () => selectedPage ? treeNodes.filter((node) => node.parentId === selectedPage.id) : [],
    [selectedPage, treeNodes]
  );

  async function loadWiki(preferredPageId = selectedPage?.id ?? null) {
    setError(null);
    setIsLoading(true);

    try {
      const [nextTree, nextPages] = await Promise.all([
        getWikiTree(includeArchived),
        getWikiPages({ search, includeArchived, sort, page, pageSize: wikiPageSize })
      ]);
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

  async function selectPage(id: string) {
    setError(null);

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
    <section className="wiki-page wiki-wikipedia-page" aria-labelledby="wiki-title">
      <header className="wiki-shell-header">
        <div>
          <p className="eyebrow">Repositorium</p>
          <h2 id="wiki-title">Wiki</h2>
        </div>
        <nav className="wiki-page-tabs" aria-label="Wiki navigation">
          <button className={view === "article" ? "active" : ""} type="button" onClick={() => setView("article")}>
            Article
          </button>
          <button className={view === "explore" ? "active" : ""} type="button" onClick={() => setView("explore")}>
            Explore
          </button>
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

      <div className="wiki-reading-layout">
        <aside className="wiki-left-rail" aria-label="Wiki topic tree">
          <div className="wiki-rail-heading">
            <strong>Contents</strong>
            <button className="text-button" type="button" onClick={startNewRootPage}>
              Add topic
            </button>
          </div>
          {nestedTree.length ? (
            <ul className="wiki-tree">
              {nestedTree.map((node) => (
                <WikiTreeNodeView
                  expandedIds={expandedIds}
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
            childNodes={articleChildren}
            isLoading={isLoading}
            page={selectedPage}
            renderedMarkdown={renderedMarkdown}
            onCreateChild={() => startNewChildPage()}
            onEdit={startEditPage}
            onOpenChild={selectPage}
          />
        ) : null}

        {view === "explore" ? (
          <WikiExplore
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
  page: WikiPageRecord | null;
  renderedMarkdown: { nodes: ReactNode[]; headings: MarkdownHeading[] };
  childNodes: WikiTreeNode[];
  isLoading: boolean;
  onEdit: () => void;
  onCreateChild: () => void;
  onOpenChild: (id: string) => void;
}) {
  if (props.isLoading) {
    return <main className="wiki-document"><p className="empty-state">Loading article...</p></main>;
  }

  if (!props.page) {
    return (
      <main className="wiki-document wiki-empty-document">
        <h1>Wiki repository</h1>
        <p>Create the first page and start building your own interview knowledge base.</p>
        <button className="primary-button compact-button" type="button" onClick={props.onCreateChild}>
          Create first article
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
            <button className="secondary-button compact-button" type="button" onClick={props.onCreateChild}>
              Add subtopic
            </button>
            <button className="primary-button compact-button" type="button" onClick={props.onEdit}>
              Edit source
            </button>
          </div>
        </header>

        <div className="wiki-article-body-grid">
          <aside className="wiki-page-contents" aria-label="Article contents">
            <strong>Contents</strong>
            {props.renderedMarkdown.headings.length ? (
              <nav>
                {props.renderedMarkdown.headings.map((heading) => (
                  <a className={`level-${heading.level}`} href={`#${heading.id}`} key={heading.id}>
                    {heading.text}
                  </a>
                ))}
              </nav>
            ) : (
              <span>No headings</span>
            )}
          </aside>

          <div className="wiki-article-content official-wiki-content">
            {shouldRenderSummaryLead(props.page) ? <p className="wiki-lead">{props.page.summary}</p> : null}
            {props.renderedMarkdown.nodes.length ? props.renderedMarkdown.nodes : <p className="empty-state">This article is empty.</p>}

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

function WikiExplore(props: {
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
          New article
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
                <small>
                  {wikiPage.path} · {wikiPage.childCount} subtopics · updated {formatDateTime(wikiPage.updatedAt)}
                </small>
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
          Previous
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
          Next
        </button>
      </div>
    </main>
  );
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
  const preview = useMemo(() => renderMarkdown(props.form.contentMarkdown), [props.form.contentMarkdown]);

  function insertSnippet(snippet: string, fallbackSelection = "") {
    const textarea = sourceTextareaRef.current;
    const insertion = insertMarkdownSnippet(
      props.form.contentMarkdown,
      snippet,
      textarea?.selectionStart ?? props.form.contentMarkdown.length,
      textarea?.selectionEnd ?? props.form.contentMarkdown.length,
      fallbackSelection
    );

    props.onUpdate("contentMarkdown", insertion.value);

    requestAnimationFrame(() => {
      sourceTextareaRef.current?.focus();
      sourceTextareaRef.current?.setSelectionRange(insertion.selectionStart, insertion.selectionEnd);
    });
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
              Cancel
            </button>
            <button className="primary-button compact-button" type="submit" disabled={props.isSaving}>
              {props.isSaving ? "Saving..." : "Save article"}
            </button>
          </div>
        </header>

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

        <label className="wiki-wide-label">
          Article source
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
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet("```csharp\n{{selection}}\n```", "// Paste code here")}>
                  Code
                </button>
                <button className="secondary-button compact-button" type="button" onClick={() => insertSnippet("| Topic | Notes |\n| --- | --- |\n|  |  |")}>
                  Table
                </button>
              </div>
              <textarea
                ref={sourceTextareaRef}
                className="wiki-source-textarea"
                value={props.form.contentMarkdown}
                onChange={(event) => props.onUpdate("contentMarkdown", event.target.value)}
                placeholder="Use headings, bullet points, comparison tables, code snippets and links."
              />
            </section>
            <aside className="wiki-editor-preview" aria-label="Markdown preview">
              <div className="wiki-preview-heading">
                <span>Live preview</span>
                <strong>{props.form.title || "Untitled article"}</strong>
              </div>
              <div className="official-wiki-content">
                {props.form.summary.trim() ? <p className="wiki-lead">{props.form.summary}</p> : null}
                {preview.nodes.length ? preview.nodes : <p className="empty-state">Nothing to preview yet.</p>}
              </div>
            </aside>
          </div>
        </label>

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
              Delete article and subtopics
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
              JSON structure
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
                Use contentMarkdown for raw markdown, or lead, infobox, sections, tables, code, references, and children for a full Wikipedia-style page.
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

function createWikiForm(page: WikiPageRecord): WikiForm {
  return {
    parentId: page.parentId ?? "",
    title: page.title,
    slug: page.slug,
    summary: page.summary ?? "",
    contentMarkdown: page.contentMarkdown,
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
    contentMarkdown: form.contentMarkdown
  };
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

function parseWikiBatchImport(contents: string): ImportWikiPageNodeRequest[] {
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
    children
  };
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
  const bullets = readWikiStringArray(value.list ?? value.bullets, `${path}.list`);
  const steps = readWikiStringArray(value.steps ?? value.orderedList, `${path}.steps`);
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

  if (bullets.length > 0) {
    chunks.push(bullets.map((item) => `- ${item}`).join("\n"));
  }

  if (steps.length > 0) {
    chunks.push(steps.map((item, index) => `${index + 1}. ${item}`).join("\n"));
  }

  if (table) {
    chunks.push(table);
  }

  if (code) {
    chunks.push(code);
  }

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
    const items = readWikiStringArray(value.items, `${path}.items`);
    return items.map((item) => `- ${item}`).join("\n");
  }

  if (type === "steps" || type === "ordered-list") {
    const items = readWikiStringArray(value.items, `${path}.items`);
    return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
  }

  if (type === "table") {
    return renderWikiTable(value, path);
  }

  if (type === "code") {
    return renderWikiCode(value, path);
  }

  return readRequiredWikiString(value, "text", path);
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
    return `\`\`\`\n${value}\n\`\`\``;
  }

  if (!isRecord(value)) {
    return "";
  }

  const content = readRequiredWikiString(value, "content", path);
  const language = readOptionalWikiString(value.language);
  return `\`\`\`${language}\n${content}\n\`\`\``;
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

function shouldRenderSummaryLead(page: WikiPageRecord) {
  const summary = page.summary?.trim();

  if (!summary) {
    return false;
  }

  return !page.contentMarkdown.trim().startsWith(summary);
}

function renderMarkdown(markdown: string): { nodes: ReactNode[]; headings: MarkdownHeading[] } {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  const headings: MarkdownHeading[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index++;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      index++;

      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index++;
      }

      index++;
      nodes.push(
        <pre className="wiki-code-block" key={`code-${index}`}>
          {language ? <span>{language}</span> : null}
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = createHeadingId(text, headings.length);
      headings.push({ id, level, text });
      nodes.push(renderHeading(level, id, text));
      index++;
      continue;
    }

    if (isTableStart(lines, index)) {
      const tableLines = [lines[index]];
      index += 2;

      while (index < lines.length && lines[index].includes("|")) {
        tableLines.push(lines[index]);
        index++;
      }

      nodes.push(renderTable(tableLines, `table-${index}`));
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const listItems: ReactNode[] = [];

      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        listItems.push(<li key={`li-${index}`}>{formatInline(lines[index].replace(/^\s*[-*]\s+/, ""))}</li>);
        index++;
      }

      nodes.push(<ul key={`ul-${index}`}>{listItems}</ul>);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: ReactNode[] = [];

      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        listItems.push(<li key={`oli-${index}`}>{formatInline(lines[index].replace(/^\s*\d+\.\s+/, ""))}</li>);
        index++;
      }

      nodes.push(<ol key={`ol-${index}`}>{listItems}</ol>);
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];

      while (index < lines.length && lines[index].startsWith(">")) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index++;
      }

      nodes.push(<blockquote key={`quote-${index}`}>{formatInline(quoteLines.join(" "))}</blockquote>);
      continue;
    }

    const paragraphLines = [line.trim()];
    index++;

    while (index < lines.length && lines[index].trim() && !isSpecialMarkdownLine(lines, index)) {
      paragraphLines.push(lines[index].trim());
      index++;
    }

    nodes.push(<p key={`p-${index}`}>{formatInline(paragraphLines.join(" "))}</p>);
  }

  return { nodes, headings };
}

function renderHeading(level: number, id: string, text: string) {
  if (level <= 1) {
    return <h2 id={id} key={id}>{text}</h2>;
  }

  if (level === 2) {
    return <h3 id={id} key={id}>{text}</h3>;
  }

  if (level === 3) {
    return <h4 id={id} key={id}>{text}</h4>;
  }

  return <h5 id={id} key={id}>{text}</h5>;
}

function isTableStart(lines: string[], index: number) {
  return lines[index]?.includes("|") && /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[index + 1] ?? "");
}

function isSpecialMarkdownLine(lines: string[], index: number) {
  const line = lines[index];

  return line.startsWith("```")
    || /^(#{1,4})\s+/.test(line)
    || /^\s*[-*]\s+/.test(line)
    || /^\s*\d+\.\s+/.test(line)
    || line.startsWith(">")
    || isTableStart(lines, index);
}

function renderTable(tableLines: string[], key: string) {
  const [headerLine, ...bodyLines] = tableLines;
  const headers = splitTableRow(headerLine);
  const rows = bodyLines.map(splitTableRow);

  return (
    <div className="wiki-table-wrap" key={key}>
      <table>
        <thead>
          <tr>
            {headers.map((header, index) => <th key={`h-${index}`}>{formatInline(header)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`r-${rowIndex}`}>
              {headers.map((_, cellIndex) => (
                <td key={`c-${cellIndex}`}>{formatInline(row[cellIndex] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function splitTableRow(row: string) {
  return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function formatInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith("`")) {
      nodes.push(<code key={`${match.index}-code`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={`${match.index}-strong`}>{token.slice(2, -2)}</strong>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const href = linkMatch?.[2] ?? "";
      nodes.push(
        <a href={href} key={`${match.index}-link`} rel="noreferrer" target="_blank">
          {linkMatch?.[1] ?? token}
        </a>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function createHeadingId(text: string, index: number) {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "section"}-${index}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
