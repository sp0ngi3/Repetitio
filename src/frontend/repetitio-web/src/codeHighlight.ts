import hljs from "highlight.js/lib/core";
import csharp from "highlight.js/lib/languages/csharp";
import python from "highlight.js/lib/languages/python";
import yaml from "highlight.js/lib/languages/yaml";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import sql from "highlight.js/lib/languages/sql";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import go from "highlight.js/lib/languages/go";

for (const [name, grammar] of Object.entries({ csharp, python, yaml, json, bash, dockerfile, javascript, typescript, sql, xml, css, java, cpp, go })) {
  hljs.registerLanguage(name, grammar);
}

export const codeLanguages = [
  ["csharp", "C#"], ["python", "Python"], ["yaml", "YAML / Compose"], ["dockerfile", "Dockerfile"],
  ["json", "JSON"], ["bash", "Shell"], ["typescript", "TypeScript"], ["javascript", "JavaScript"],
  ["sql", "SQL"], ["java", "Java"], ["cpp", "C++"], ["go", "Go"], ["text", "Plain text / ASCII"]
] as const;

const aliases: Record<string, string> = {
  "c#": "csharp", cs: "csharp", "c-sharp": "csharp", py: "python", yml: "yaml",
  "docker-compose": "yaml", compose: "yaml", sh: "bash", shell: "bash", js: "javascript",
  ts: "typescript", html: "xml", "c++": "cpp", plaintext: "text", ascii: "text"
};

export function normalizeCodeLanguage(value: string) {
  const name = value.trim().split(/\s+/)[0].toLowerCase();
  return aliases[name] ?? name;
}

export function codeLanguageLabel(value: string) {
  const name = normalizeCodeLanguage(value);
  return codeLanguages.find(([language]) => language === name)?.[1] ?? (name === "mermaid" ? "Mermaid" : value || "Plain text");
}

export function highlightCode(source: string, language: string) {
  const name = normalizeCodeLanguage(language);
  if (source.length <= 100_000 && hljs.getLanguage(name)) {
    try { return hljs.highlight(source, { language: name, ignoreIllegals: true }).value; } catch { /* Retain readable source if a grammar fails. */ }
  }
  return source.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
