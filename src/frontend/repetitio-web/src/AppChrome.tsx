import { ArrowUp, BookOpen, Braces, Code2, GraduationCap, Layers, LayoutDashboard, Moon, Network, Settings2, ShieldCheck, StickyNote, Sun, Waves } from "lucide-react";
import type { ColorMode, VisualStyle } from "./appearance";
import type { ReactNode } from "react";

export type AppPage = "overview" | "dsa" | "system-design" | "basics" | "flashcards" | "wiki" | "notes" | "settings";
export const appPages = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "dsa", label: "DSA", icon: Code2 },
  { id: "system-design", label: "System Design", icon: Network },
  { id: "basics", label: "Basics", icon: Braces },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "wiki", label: "Wiki", icon: BookOpen },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "settings", label: "Settings", icon: Settings2 }
] as const;

interface AppHeaderProps {
  page: AppPage;
  mode: ColorMode;
  onNavigate: (page: AppPage) => void;
  onToggleMode: () => void;
  connection: ReactNode;
}

export function AppHeader({ page, mode, onNavigate, onToggleMode, connection }: AppHeaderProps) {
  const ModeIcon = mode === "dark" ? Sun : Moon;
  const toggleLabel = mode === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <header className="app-header">
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <div className="app-header-main">
        <button className="app-brand" type="button" onClick={() => onNavigate("overview")} aria-label="Repetitio home">
          <img src="/icon.ico" alt="" width="38" height="38" />
          <span><strong>Repetitio</strong><small>Learning workspace</small></span>
        </button>
        <div className="app-header-utilities">
          {connection}
          <button className="shell-icon-button theme-toggle" aria-label={toggleLabel} title={toggleLabel} type="button" onClick={onToggleMode}>
            <ModeIcon size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <nav className="app-nav" aria-label="Primary navigation">
        {appPages.map(({ id, label, icon: Icon }) => (
          <button key={id} aria-current={page === id ? "page" : undefined} className={page === id ? "active" : ""} type="button" onClick={() => onNavigate(id)}>
            <Icon size={17} aria-hidden="true" /><span>{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}

export function AppFooter({ mode, style }: { mode: ColorMode; style: VisualStyle }) {
  const StyleIcon = style === "vaporwave" ? Waves : GraduationCap;
  function backToTop() {
    const reduced = document.documentElement.dataset.motion === "reduced" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });
  }
  return (
    <footer className="app-footer">
      <div className="footer-brand">
        <StyleIcon size={20} aria-hidden="true" /><strong>Repetitio</strong><span>Keep learning. Keep building.</span>
      </div>
      <div className="footer-meta">
        <span><ShieldCheck size={15} aria-hidden="true" />Local-first</span>
        <span>{style === "vaporwave" ? "Vaporwave" : "Professional"} / {mode === "dark" ? "Dark" : "Light"}</span>
        <button className="shell-icon-button" type="button" title="Back to top" aria-label="Back to top" onClick={backToTop}>
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      </div>
    </footer>
  );
}
