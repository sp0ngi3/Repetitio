import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function CopyCodeButton({ source }: { source: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);
  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(source);
      setStatus("copied");
    } catch { setStatus("failed"); }
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setStatus("idle"), 2200);
  }
  const label = status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy code";
  const Icon = status === "copied" ? Check : status === "failed" ? X : Copy;
  return <button className="code-icon-button" type="button" onClick={() => void copy()} title={label} aria-label={label}>
    <Icon size={16} aria-hidden="true" /><span className="visually-hidden" aria-live="polite">{label}</span>
  </button>;
}
