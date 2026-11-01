import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";

export const compactLayoutQuery = "(max-width: 1024px), (pointer: coarse) and (max-width: 1400px)";
export const tabletLandscapeQuery = "(min-width: 1000px) and (min-height: 600px) and (orientation: landscape) and (pointer: coarse)";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const change = () => setMatches(media.matches);
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [query]);
  return matches;
}

export const useCompactLayout = () => useMediaQuery(compactLayoutQuery);
export const useTabletLandscape = () => useMediaQuery(tabletLandscapeQuery);

export function CompactDisclosure({ compact, label, children }: { compact: boolean; label: string; children: ReactNode }) {
  return compact ? <details className="compact-disclosure"><summary>{label}<ChevronDown size={17} aria-hidden="true" /></summary>{children}</details> : <>{children}</>;
}

export function MobileSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previous; };
  }, []);
  return createPortal(<dialog ref={dialog} className="mobile-sheet" aria-label={title}
    onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className="mobile-sheet-content" onClick={event => event.stopPropagation()}>
      <header><h2>{title}</h2><button className="secondary-button compact-button" type="button" aria-label={`Close ${title.toLowerCase()}`} title="Close" onClick={onClose}><X size={20} /></button></header>
      <div className="mobile-sheet-body">{children}</div>
    </div>
  </dialog>, document.body);
}
