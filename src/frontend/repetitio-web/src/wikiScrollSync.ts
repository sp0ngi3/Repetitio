import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

export interface WikiScrollAnchor { source: number; preview: number; }

export function normalizeScrollAnchors(anchors: WikiScrollAnchor[]) {
  const sorted = anchors.filter(anchor => Number.isFinite(anchor.source) && Number.isFinite(anchor.preview))
    .sort((a, b) => a.source - b.source || a.preview - b.preview);
  const result: WikiScrollAnchor[] = [];
  for (const anchor of sorted) {
    if (result.at(-1)?.source === anchor.source || anchor.preview < (result.at(-1)?.preview ?? 0)) continue;
    result.push(anchor);
  }
  return result;
}

export function mappedScrollPosition(position: number, anchors: WikiScrollAnchor[], direction: "source" | "preview") {
  const other = direction === "source" ? "preview" : "source";
  if (!anchors.length) return 0;
  if (position <= anchors[0][direction]) return anchors[0][other];
  for (let index = 1; index < anchors.length; index++) {
    const before = anchors[index - 1], after = anchors[index];
    if (position > after[direction]) continue;
    const distance = after[direction] - before[direction];
    return distance > 0 ? before[other] + (position - before[direction]) / distance * (after[other] - before[other]) : after[other];
  }
  return anchors.at(-1)![other];
}

// Mirror native textarea wrapping, then pair Markdown line ranges with rendered block geometry.
export function measureWikiScrollAnchors(source: HTMLTextAreaElement, preview: HTMLElement, mirror: HTMLElement) {
  if (!source.clientWidth) return [];
  const styles = getComputedStyle(source);
  for (const property of ["font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "tab-size", "padding-top", "padding-bottom", "padding-left", "padding-right", "word-break", "text-indent"]) {
    mirror.style.setProperty(property, styles.getPropertyValue(property));
  }
  mirror.style.width = `${source.clientWidth}px`;
  mirror.style.whiteSpace = source.wrap === "off" ? "pre" : "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  const text = document.createTextNode(source.value + "\n\u200b");
  mirror.replaceChildren(text);
  const offsets = [0];
  for (let index = 0; index < source.value.length; index++) if (source.value[index] === "\n") offsets.push(index + 1);
  offsets.push(source.value.length + 1);
  const range = document.createRange();
  function textTop(offset: number) {
    range.setStart(text, offset);
    range.setEnd(text, Math.min(offset + 1, text.length));
    return range.getBoundingClientRect().top;
  }
  const firstTop = textTop(0), padding = parseFloat(styles.paddingTop) || 0;
  const heights = new Map<number, number>();
  function lineTop(line: number) {
    if (!heights.has(line)) heights.set(line, textTop(offsets[Math.min(line, offsets.length - 1)]) - firstTop + padding);
    return heights.get(line)!;
  }
  const previewTop = preview.getBoundingClientRect().top + preview.clientTop;
  const anchors: WikiScrollAnchor[] = [{ source: 0, preview: 0 }];
  for (const block of preview.querySelectorAll<HTMLElement>("[data-source-start][data-source-end]")) {
    // Collapsed answers and nested scrollports do not occupy these outer document positions.
    if (block.parentElement?.closest("details:not([open]), .wiki-table-wrap, .wiki-code-block")) continue;
    if (!block.getClientRects().length || block.closest(".wiki-table-dialog")) continue;
    const rect = block.getBoundingClientRect();
    if (!rect.height) continue;
    const start = Number(block.dataset.sourceStart), end = Number(block.dataset.sourceEnd);
    anchors.push({ source: lineTop(start), preview: rect.top - previewTop + preview.scrollTop });
    anchors.push({ source: lineTop(end), preview: rect.bottom - previewTop + preview.scrollTop });
  }
  const last = { source: Math.max(source.scrollHeight, lineTop(offsets.length - 1)), preview: preview.scrollHeight };
  anchors.push(last);
  return normalizeScrollAnchors(anchors);
}

export function useWikiScrollSync(sourceRef: RefObject<HTMLTextAreaElement | null>, previewRef: RefObject<HTMLDivElement | null>, content: string) {
  const anchors = useRef<WikiScrollAnchor[]>([]);
  const driver = useRef<"source" | "preview">("source");
  const ignored = useRef(new WeakMap<HTMLElement, number>());
  const synchronize = useCallback((direction: "source" | "preview", user = true) => {
    const source = direction === "source" ? sourceRef.current : previewRef.current;
    const target = direction === "source" ? previewRef.current : sourceRef.current;
    if (!source || !target) return;
    if (user) {
      const expected = ignored.current.get(source);
      ignored.current.delete(source);
      if (expected !== undefined && Math.abs(source.scrollTop - expected) < 1) return;
      driver.current = direction;
    }
    const destination = Math.max(0, Math.min(target.scrollHeight - target.clientHeight, mappedScrollPosition(source.scrollTop, anchors.current, direction)));
    if (Math.abs(destination - target.scrollTop) < 1) return;
    ignored.current.set(target, destination);
    target.scrollTop = destination;
    ignored.current.set(target, target.scrollTop);
  }, [sourceRef, previewRef]);
  useLayoutEffect(() => {
    const source = sourceRef.current, preview = previewRef.current;
    if (!source || !preview) return;
    driver.current = "source";
    const mirror = document.createElement("div");
    mirror.className = "wiki-source-measure";
    document.body.appendChild(mirror);
    let frame = 0;
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        anchors.current = measureWikiScrollAnchors(source!, preview!, mirror);
        synchronize(driver.current, false);
      });
    }
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resize?.observe(source); resize?.observe(preview);
    function observeContent() {
      for (const child of preview!.children) resize?.observe(child);
      schedule();
    }
    const mutation = new MutationObserver(observeContent);
    mutation.observe(preview, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    const appearance = new MutationObserver(schedule);
    appearance.observe(document.documentElement, { attributes: true, attributeFilter: ["data-style", "data-theme"] });
    observeContent();
    preview.addEventListener("load", schedule, true);
    preview.addEventListener("error", schedule, true);
    preview.addEventListener("toggle", schedule, true);
    document.fonts?.addEventListener("loadingdone", schedule);
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame); resize?.disconnect(); mutation.disconnect(); appearance.disconnect(); mirror.remove();
      preview.removeEventListener("load", schedule, true);
      preview.removeEventListener("error", schedule, true);
      preview.removeEventListener("toggle", schedule, true);
      document.fonts?.removeEventListener("loadingdone", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [content, sourceRef, previewRef, synchronize]);
  return { onSourceScroll: () => synchronize("source"), onPreviewScroll: () => synchronize("preview") };
}
