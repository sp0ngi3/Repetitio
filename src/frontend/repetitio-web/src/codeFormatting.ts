import { formatCSharp } from "./api";
import { normalizeCodeLanguage } from "./codeHighlight";

const parsers: Record<string, string> = {
  javascript: "babel", typescript: "typescript", json: "json", yaml: "yaml",
  css: "css", xml: "html", html: "html", markdown: "markdown"
};

export function canFormatCode(language: string) {
  const name = normalizeCodeLanguage(language);
  return name === "csharp" || name in parsers;
}

export async function formatSourceCode(source: string, language: string): Promise<string> {
  const name = normalizeCodeLanguage(language);
  if (name === "csharp") return (await formatCSharp(source)).sourceCode;
  const parser = parsers[name];
  if (!parser) throw new Error("Use indentation controls for this language. Automatic formatting is not available.");
  const [prettier, babel, estree, typescript, yaml, postcss, html, markdown] = await Promise.all([
    import("prettier/standalone"), import("prettier/plugins/babel"), import("prettier/plugins/estree"),
    import("prettier/plugins/typescript"), import("prettier/plugins/yaml"), import("prettier/plugins/postcss"),
    import("prettier/plugins/html"), import("prettier/plugins/markdown")
  ]);
  return prettier.format(source, { parser, plugins: [babel, estree, typescript, yaml, postcss, html, markdown],
    tabWidth: 4, printWidth: 100, endOfLine: "lf" });
}
