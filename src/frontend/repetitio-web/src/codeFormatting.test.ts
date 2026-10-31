import { expect, it, vi } from "vitest";
import { canFormatCode, formatSourceCode } from "./codeFormatting";
import { formatCSharp } from "./api";
vi.mock("./api", () => ({ formatCSharp: vi.fn() }));

it("uses the existing API for C# and proven browser parsers for JSON, YAML and JS", async () => {
  vi.mocked(formatCSharp).mockResolvedValue({ sourceCode: "class Example\n{\n}" });
  expect(await formatSourceCode("class Example{}", "C#")).toBe("class Example\n{\n}");
  expect(await formatSourceCode('{"answer":42}', "JSON")).toBe('{ "answer": 42 }\n');
  expect(await formatSourceCode("const sum=(a,b)=>{return a+b}", "JavaScript")).toContain("return a + b;");
  expect(await formatSourceCode("services: {api: {image: test}}", "YAML")).toContain("image: test");
  expect(canFormatCode("Python")).toBe(false);
  await expect(formatSourceCode("print(1)", "Python")).rejects.toThrow("Automatic formatting is not available");
});
