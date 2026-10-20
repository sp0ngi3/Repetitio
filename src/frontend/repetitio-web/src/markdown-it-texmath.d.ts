declare module "markdown-it-texmath" {
  import type MarkdownIt from "markdown-it";
  interface MathRule {
    name: string; rex: RegExp; tmpl: string; tag: string; displayMode?: boolean;
    pre?: (source: string, outerSpace: boolean, position: number) => boolean;
    post?: (source: string, outerSpace: boolean, position: number) => boolean;
  }
  const plugin: ((markdown: MarkdownIt, options?: Record<string, unknown>) => void) & { rules: Record<string, { inline: MathRule[]; block: MathRule[] }> };
  export default plugin;
}
