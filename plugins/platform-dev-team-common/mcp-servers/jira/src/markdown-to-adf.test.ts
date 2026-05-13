// Golden tests for markdownToAdf. 실행: `npm test` (tsx --test).

import test from "node:test";
import { deepStrictEqual, ok } from "node:assert/strict";
import { markdownToAdf, ADF_VERSION } from "./markdown-to-adf.js";

function adfDoc(content: unknown[]) {
  return { version: ADF_VERSION, type: "doc", content };
}

test("heading levels 1-6 map to ADF heading attrs.level", () => {
  const md = "# h1\n\n## h2\n\n### h3\n\n#### h4\n\n##### h5\n\n###### h6\n";
  const { adf, warnings } = markdownToAdf(md);
  deepStrictEqual(warnings, []);
  deepStrictEqual(
    adf,
    adfDoc([
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "h1" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "h2" }] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "h3" }] },
      { type: "heading", attrs: { level: 4 }, content: [{ type: "text", text: "h4" }] },
      { type: "heading", attrs: { level: 5 }, content: [{ type: "text", text: "h5" }] },
      { type: "heading", attrs: { level: 6 }, content: [{ type: "text", text: "h6" }] },
    ])
  );
});

test("paragraph with bold, italic, inline code marks", () => {
  const md = "Hello **bold** and *italic* and `code` end.";
  const { adf, warnings } = markdownToAdf(md);
  deepStrictEqual(warnings, []);
  deepStrictEqual(
    adf,
    adfDoc([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Hello " },
          { type: "text", text: "bold", marks: [{ type: "strong" }] },
          { type: "text", text: " and " },
          { type: "text", text: "italic", marks: [{ type: "em" }] },
          { type: "text", text: " and " },
          { type: "text", text: "code", marks: [{ type: "code" }] },
          { type: "text", text: " end." },
        ],
      },
    ])
  );
});

test("fenced code block preserves language attr", () => {
  const md = "```ts\nconst x: number = 1;\n```\n";
  const { adf, warnings } = markdownToAdf(md);
  deepStrictEqual(warnings, []);
  deepStrictEqual(
    adf,
    adfDoc([
      {
        type: "codeBlock",
        attrs: { language: "ts" },
        content: [{ type: "text", text: "const x: number = 1;" }],
      },
    ])
  );
});

test("bullet list and ordered list produce listItem with paragraph", () => {
  const md = "- a\n- b\n\n1. x\n2. y\n";
  const { adf, warnings } = markdownToAdf(md);
  deepStrictEqual(warnings, []);
  deepStrictEqual(
    adf,
    adfDoc([
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "b" }] }] },
        ],
      },
      {
        type: "orderedList",
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "y" }] }] },
        ],
      },
    ])
  );
});

test("task list maps to ADF taskList with TODO/DONE states", () => {
  const md = "- [ ] todo item\n- [x] done item\n";
  const { adf, warnings } = markdownToAdf(md);
  deepStrictEqual(warnings, []);
  deepStrictEqual(
    adf,
    adfDoc([
      {
        type: "taskList",
        attrs: { localId: "tasklist-1" },
        content: [
          {
            type: "taskItem",
            attrs: { localId: "task-2", state: "TODO" },
            content: [{ type: "text", text: "todo item" }],
          },
          {
            type: "taskItem",
            attrs: { localId: "task-3", state: "DONE" },
            content: [{ type: "text", text: "done item" }],
          },
        ],
      },
    ])
  );
});

test("GFM table maps to ADF table with header row + body rows", () => {
  const md = "| col1 | col2 |\n|------|------|\n| a    | b    |\n| c    | d    |\n";
  const { adf, warnings } = markdownToAdf(md);
  deepStrictEqual(warnings, []);
  deepStrictEqual(
    adf,
    adfDoc([
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "col1" }] }] },
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "col2" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "b" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "c" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "d" }] }] },
            ],
          },
        ],
      },
    ])
  );
});

test("link inline mark with href", () => {
  const md = "see [Atlassian](https://atlassian.com) docs";
  const { adf, warnings } = markdownToAdf(md);
  deepStrictEqual(warnings, []);
  deepStrictEqual(
    adf,
    adfDoc([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "see " },
          {
            type: "text",
            text: "Atlassian",
            marks: [{ type: "link", attrs: { href: "https://atlassian.com" } }],
          },
          { type: "text", text: " docs" },
        ],
      },
    ])
  );
});

test("blockquote wraps inner paragraphs", () => {
  const md = "> quoted line\n> second line\n";
  const { adf, warnings } = markdownToAdf(md);
  deepStrictEqual(warnings, []);
  deepStrictEqual(
    adf,
    adfDoc([
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "quoted line\nsecond line" }],
          },
        ],
      },
    ])
  );
});

test("image falls back to text link and emits warning", () => {
  const md = "![alt](https://x/y.png)";
  const { adf, warnings } = markdownToAdf(md);
  ok(warnings.length === 1 && warnings[0].includes("image fallback"));
  deepStrictEqual(
    adf,
    adfDoc([
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "alt",
            marks: [{ type: "link", attrs: { href: "https://x/y.png" } }],
          },
        ],
      },
    ])
  );
});

test("ADF root document always carries version and type='doc'", () => {
  const { adf } = markdownToAdf("hello");
  deepStrictEqual(adf.version, ADF_VERSION);
  deepStrictEqual(adf.type, "doc");
});
