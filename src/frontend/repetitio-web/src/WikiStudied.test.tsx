import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getWikiPage, getWikiPages, getWikiStudy, getWikiTree, setWikiStudied } from "./api";
import { WikiPage } from "./WikiPage";
import type { WikiPage as WikiPageRecord } from "./types";
import { compactLayoutQuery, tabletLandscapeQuery } from "./responsive";

vi.mock("./api", async importOriginal => ({
  ...await importOriginal<typeof import("./api")>(),
  getWikiPage: vi.fn(), getWikiPages: vi.fn(), getWikiStudy: vi.fn(), getWikiTree: vi.fn(), setWikiStudied: vi.fn()
}));

let pages: WikiPageRecord[];
const topicButton = (title: string) => within(screen.getByRole("complementary", { name: "Wiki topic tree" }))
  .getByRole("button", { name: new RegExp(`^${title}`) });
const row = (title: string) => topicButton(title).closest(".wiki-tree-row");

beforeEach(() => {
  vi.clearAllMocks();
  pages = ["Root", "Child", "Other"].map((title, index) => ({
    id: title, title, parentId: index === 1 ? "Root" : null, slug: title.toLowerCase(),
    path: index === 1 ? "root/child" : title.toLowerCase(), depth: index === 1 ? 1 : 0,
    sortOrder: index, contentMarkdown: "## Material\n\nArticle content.", summary: null,
    isArchived: false, isStudied: false, childCount: index === 0 ? 1 : 0,
    createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
    sources: [], quizQuestions: [], flashcards: []
  }));
  vi.mocked(getWikiTree).mockImplementation(async () => pages.map(page => ({ ...page })));
  vi.mocked(getWikiPages).mockImplementation(async () => ({ items: pages.map(page => ({ ...page })), totalCount: 3, page: 1, pageSize: 15 }));
  vi.mocked(getWikiPage).mockImplementation(async id => ({ ...pages.find(page => page.id === id)! }));
  vi.mocked(getWikiStudy).mockResolvedValue({ intervalDays: 30, pages: [], history: [] });
  vi.mocked(setWikiStudied).mockImplementation(async (id, isStudied) => {
    pages = pages.map(page => page.id === id ? { ...page, isStudied } : page);
    return { isStudied };
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("opens a topic from the tree while the article list and review progress are still loading", async () => {
  let finishList!: (value: Awaited<ReturnType<typeof getWikiPages>>) => void;
  let finishStudy!: (value: Awaited<ReturnType<typeof getWikiStudy>>) => void;
  vi.mocked(getWikiPages).mockReturnValueOnce(new Promise(resolve => { finishList = resolve; }));
  vi.mocked(getWikiStudy).mockReturnValueOnce(new Promise(resolve => { finishStudy = resolve; }));

  render(<WikiPage />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading topics");
  const tree = within(screen.getByRole("complementary", { name: "Wiki topic tree" }));
  fireEvent.click(await tree.findByRole("button", { name: "Other" }));
  expect(await screen.findByRole("heading", { name: "Other" })).toBeInTheDocument();

  await act(async () => finishList({ items: pages, totalCount: 3, page: 1, pageSize: 15 }));
  expect(screen.getByRole("heading", { name: "Other" })).toBeInTheDocument();
  expect(getWikiPage).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Reviews" }));
  expect(screen.getByRole("status")).toHaveTextContent("Loading review progress");
  await act(async () => finishStudy({ intervalDays: 30, pages: [], history: [] }));
  expect(screen.getByRole("heading", { name: "Wiki reviews" })).toBeInTheDocument();
});

it("keeps studied markers in the portalled phone tree with an SVG check in a fixed status slot", async () => {
  pages[0].isStudied = true;
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === compactLayoutQuery, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const original = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  try {
    render(<WikiPage />);
    await screen.findByRole("heading", { name: "Root" });
    fireEvent.click(screen.getByRole("button", { name: "Topics" }));
    const sheet = screen.getByRole("dialog", { name: "Wiki topics" });
    const button = within(sheet).getByRole("button", { name: "Root" });
    expect(button.closest(".wiki-topic-tree")).not.toBeNull();
    expect(button.closest(".wiki-tree-row")).toHaveClass("studied");
    expect(within(button).getByRole("img", { name: "Studied" }).querySelector("svg")).not.toBeNull();
    expect(button.querySelector(".wiki-tree-title")).toHaveTextContent("Root");
    expect(button).not.toHaveTextContent("✓");
    expect(setWikiStudied).not.toHaveBeenCalled();
  } finally {
    if (original) Object.defineProperty(HTMLDialogElement.prototype, "showModal", original);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  }
});

it("pins the tree on landscape tablets, but gives the full workspace to editing and study", async () => {
  pages[0].isStudied = true;
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === compactLayoutQuery || query === tabletLandscapeQuery,
    addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const { container } = render(<WikiPage />);
  await screen.findByRole("heading", { name: "Root" });
  expect(container.querySelector("[data-tablet-layout='reading']")).not.toBeNull();
  expect(screen.getByRole("complementary", { name: "Wiki topic tree" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Topics" })).not.toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("navigation", { name: "Wiki navigation" })).getByRole("button", { name: "Edit" }));
  expect(container.querySelector("[data-tablet-layout='workspace']")).not.toBeNull();
  expect(screen.getByRole("button", { name: "Topics" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Article source" })).toBeInTheDocument();
  expect(setWikiStudied).not.toHaveBeenCalled();
});

it("marks only the selected article, keeps the marker through navigation/search/reload, and can unmark it", async () => {
  const view = render(<WikiPage />);
  const checkbox = await screen.findByRole("checkbox", { name: "Studied" });
  expect(checkbox).not.toBeChecked();
  fireEvent.click(checkbox);
  await waitFor(() => expect(checkbox).toBeChecked());
  expect(setWikiStudied).toHaveBeenCalledWith("Root", true);
  expect(row("Root")).toHaveClass("studied", "active");
  expect(within(topicButton("Root")).getByLabelText("Studied")).toBeInTheDocument();
  fireEvent.click(within(topicButton("Root").closest(".wiki-tree-row")!).getByRole("button", { name: "Expand topic" }));
  expect(row("Child")).not.toHaveClass("studied");
  fireEvent.click(topicButton("Child"));
  await waitFor(() => expect(screen.getByRole("checkbox", { name: "Studied" })).not.toBeChecked());
  expect(row("Root")).toHaveClass("studied");
  fireEvent.change(screen.getByRole("textbox", { name: "Search topic tree" }), { target: { value: "root" } });
  expect(row("Root")).toHaveClass("studied");
  view.unmount();
  render(<WikiPage />);
  const restored = await screen.findByRole("checkbox", { name: "Studied" });
  expect(restored).toBeChecked();
  fireEvent.click(restored);
  await waitFor(() => expect(restored).not.toBeChecked());
  expect(row("Root")).not.toHaveClass("studied");
  expect(setWikiStudied).toHaveBeenLastCalledWith("Root", false);
});

it("preserves the saved status on failure and allows retrying", async () => {
  pages[0].isStudied = true;
  vi.mocked(setWikiStudied).mockRejectedValueOnce(new Error("Unable to save studied status."));
  render(<WikiPage />);
  const checkbox = await screen.findByRole("checkbox", { name: "Studied" });
  fireEvent.click(checkbox);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save studied status.");
  expect(checkbox).toBeChecked();
  expect(checkbox).toBeEnabled();
  expect(row("Root")).toHaveClass("studied");
  fireEvent.click(checkbox);
  await waitFor(() => expect(checkbox).not.toBeChecked());
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("disables duplicate saves and applies an in-flight response only to its owning page", async () => {
  let finish!: (value: { isStudied: boolean }) => void;
  vi.mocked(setWikiStudied).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  render(<WikiPage />);
  const checkbox = await screen.findByRole("checkbox", { name: "Studied" });
  fireEvent.click(checkbox);
  expect(checkbox).toBeDisabled();
  expect(checkbox).not.toBeChecked();
  fireEvent.click(checkbox);
  expect(setWikiStudied).toHaveBeenCalledTimes(1);
  fireEvent.click(within(topicButton("Root").closest(".wiki-tree-row")!).getByRole("button", { name: "Expand topic" }));
  fireEvent.click(topicButton("Child"));
  await waitFor(() => expect(row("Child")).toHaveClass("active"));
  await act(async () => finish({ isStudied: true }));
  expect(screen.getByRole("checkbox", { name: "Studied" })).not.toBeChecked();
  expect(row("Root")).toHaveClass("studied");
  expect(row("Child")).not.toHaveClass("studied");
});
