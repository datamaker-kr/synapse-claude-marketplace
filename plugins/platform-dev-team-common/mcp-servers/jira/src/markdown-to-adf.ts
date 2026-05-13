// Markdown → Atlassian Document Format (ADF) 변환기
//
// 사용 시나리오: sdd-helper의 sync-to-jira 스킬이 specs/plans markdown을 Jira description으로
// push-back할 때 호출. ADF 스펙:
// https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/

import { marked, type Tokens } from "marked";

export const ADF_VERSION = 1;

export type ADFMark =
  | { type: "strong" }
  | { type: "em" }
  | { type: "code" }
  | { type: "strike" }
  | { type: "link"; attrs: { href: string; title?: string } };

export type ADFTextNode = {
  type: "text";
  text: string;
  marks?: ADFMark[];
};

export type ADFInline = ADFTextNode | { type: "hardBreak" };

export type ADFBlock =
  | { type: "heading"; attrs: { level: 1 | 2 | 3 | 4 | 5 | 6 }; content: ADFInline[] }
  | { type: "paragraph"; content: ADFInline[] }
  | { type: "codeBlock"; attrs?: { language?: string }; content: ADFTextNode[] }
  | { type: "bulletList"; content: ADFListItem[] }
  | { type: "orderedList"; attrs?: { order?: number }; content: ADFListItem[] }
  | { type: "taskList"; attrs: { localId: string }; content: ADFTaskItem[] }
  | { type: "blockquote"; content: ADFBlock[] }
  | { type: "table"; content: ADFTableRow[] }
  | { type: "rule" };

export type ADFListItem = { type: "listItem"; content: ADFBlock[] };
export type ADFTaskItem = {
  type: "taskItem";
  attrs: { localId: string; state: "TODO" | "DONE" };
  content: ADFInline[];
};
export type ADFTableRow = { type: "tableRow"; content: ADFTableCell[] };
export type ADFTableCell = {
  type: "tableHeader" | "tableCell";
  content: ADFBlock[];
};

export type ADFDocument = {
  version: typeof ADF_VERSION;
  type: "doc";
  content: ADFBlock[];
};

export type MarkdownToAdfResult = {
  adf: ADFDocument;
  warnings: string[];
};

type ConverterState = {
  warnings: string[];
  idCounter: number;
};

function nextId(state: ConverterState, prefix: string): string {
  state.idCounter += 1;
  return `${prefix}-${state.idCounter}`;
}

// 인라인 토큰 → ADF 인라인 노드. activeMarks는 누적되며, 재귀 시 복제 후 전달.
function convertInline(
  tokens: Tokens.Generic[] | undefined,
  state: ConverterState,
  activeMarks: ADFMark[] = []
): ADFInline[] {
  if (!tokens || tokens.length === 0) return [];
  const out: ADFInline[] = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case "text": {
        const t = tok as Tokens.Text;
        // marked의 inline text 토큰은 escape된 HTML entity가 들어올 수 있음. ADF는 plain text를 기대.
        const text = decodeHtmlEntities(t.text);
        if (text.length === 0) break;
        out.push(makeTextNode(text, activeMarks));
        break;
      }
      case "escape": {
        const t = tok as Tokens.Escape;
        out.push(makeTextNode(t.text, activeMarks));
        break;
      }
      case "strong": {
        const t = tok as Tokens.Strong;
        out.push(...convertInline(t.tokens, state, [...activeMarks, { type: "strong" }]));
        break;
      }
      case "em": {
        const t = tok as Tokens.Em;
        out.push(...convertInline(t.tokens, state, [...activeMarks, { type: "em" }]));
        break;
      }
      case "del": {
        const t = tok as Tokens.Del;
        out.push(...convertInline(t.tokens, state, [...activeMarks, { type: "strike" }]));
        break;
      }
      case "codespan": {
        const t = tok as Tokens.Codespan;
        out.push(makeTextNode(decodeHtmlEntities(t.text), [...activeMarks, { type: "code" }]));
        break;
      }
      case "link": {
        const t = tok as Tokens.Link;
        const linkMark: ADFMark = t.title
          ? { type: "link", attrs: { href: t.href, title: t.title } }
          : { type: "link", attrs: { href: t.href } };
        out.push(...convertInline(t.tokens, state, [...activeMarks, linkMark]));
        break;
      }
      case "br": {
        out.push({ type: "hardBreak" });
        break;
      }
      case "image": {
        const t = tok as Tokens.Image;
        state.warnings.push(
          `image fallback: '![${t.text}](${t.href})' → 텍스트 링크로 환원 (ADF media 노드 미지원)`
        );
        const text = t.text || t.href;
        const linkMark: ADFMark = { type: "link", attrs: { href: t.href } };
        out.push(makeTextNode(text, [...activeMarks, linkMark]));
        break;
      }
      case "html": {
        const t = tok as Tokens.HTML;
        state.warnings.push(`inline html fallback: raw text로 보존`);
        out.push(makeTextNode(t.text, activeMarks));
        break;
      }
      default: {
        state.warnings.push(`unsupported inline token: '${tok.type}' → plain text fallback`);
        const anyTok = tok as { text?: string; raw?: string };
        const fallback = anyTok.text ?? anyTok.raw ?? "";
        if (fallback) out.push(makeTextNode(fallback, activeMarks));
      }
    }
  }
  return mergeAdjacentText(out);
}

function makeTextNode(text: string, marks: ADFMark[]): ADFTextNode {
  return marks.length > 0 ? { type: "text", text, marks: [...marks] } : { type: "text", text };
}

// 동일한 marks를 가진 인접 text 노드는 합쳐 ADF JSON을 단순화.
function mergeAdjacentText(nodes: ADFInline[]): ADFInline[] {
  const out: ADFInline[] = [];
  for (const node of nodes) {
    const last = out[out.length - 1];
    if (
      last &&
      last.type === "text" &&
      node.type === "text" &&
      marksEqual(last.marks, node.marks)
    ) {
      last.text += node.text;
    } else {
      out.push(node);
    }
  }
  return out;
}

function marksEqual(a: ADFMark[] | undefined, b: ADFMark[] | undefined): boolean {
  const la = a?.length ?? 0;
  const lb = b?.length ?? 0;
  if (la !== lb) return false;
  if (la === 0) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

function decodeHtmlEntities(input: string): string {
  // marked가 일부 인라인에서 `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;` 을 escape함.
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function convertList(token: Tokens.List, state: ConverterState): ADFBlock {
  const allTasks = token.items.every((it) => it.task === true);
  if (allTasks) {
    const listId = nextId(state, "tasklist");
    return {
      type: "taskList",
      attrs: { localId: listId },
      content: token.items.map((it) => convertTaskItem(it, state)),
    };
  }
  const items = token.items.map<ADFListItem>((it) => ({
    type: "listItem",
    content: convertListItemBlocks(it, state),
  }));
  if (token.ordered) {
    const start = typeof token.start === "number" ? token.start : 1;
    return start !== 1
      ? { type: "orderedList", attrs: { order: start }, content: items }
      : { type: "orderedList", content: items };
  }
  return { type: "bulletList", content: items };
}

function convertTaskItem(item: Tokens.ListItem, state: ConverterState): ADFTaskItem {
  const localId = nextId(state, "task");
  // task item은 한 줄짜리 텍스트로 가정. 내부 list/code 등 복합 구조는 평탄화.
  const inlineTokens: Tokens.Generic[] = [];
  for (const child of item.tokens) {
    if (child.type === "text") {
      const t = child as Tokens.Text;
      if (t.tokens && t.tokens.length > 0) {
        inlineTokens.push(...t.tokens);
      } else {
        inlineTokens.push({ type: "text", raw: t.raw, text: t.text } as Tokens.Generic);
      }
    } else if (child.type === "paragraph") {
      const p = child as Tokens.Paragraph;
      inlineTokens.push(...(p.tokens ?? []));
    } else {
      state.warnings.push(`taskItem 내부 '${child.type}' 노드는 인라인으로 평탄화됨`);
      const anyChild = child as { raw?: string };
      if (anyChild.raw) {
        inlineTokens.push({ type: "text", raw: anyChild.raw, text: anyChild.raw } as Tokens.Generic);
      }
    }
  }
  return {
    type: "taskItem",
    attrs: { localId, state: item.checked ? "DONE" : "TODO" },
    content: convertInline(inlineTokens, state),
  };
}

function convertListItemBlocks(item: Tokens.ListItem, state: ConverterState): ADFBlock[] {
  // marked의 list item 내부는 paragraph/list/code 등을 가질 수 있음.
  const blocks: ADFBlock[] = [];
  // loose가 아닐 때 marked는 paragraph 대신 `text` 토큰을 줄 수 있음 — 단일 paragraph로 래핑.
  const pendingInline: Tokens.Generic[] = [];
  const flushInline = () => {
    if (pendingInline.length === 0) return;
    blocks.push({ type: "paragraph", content: convertInline(pendingInline, state) });
    pendingInline.length = 0;
  };
  for (const child of item.tokens) {
    if (child.type === "text") {
      const t = child as Tokens.Text;
      if (t.tokens && t.tokens.length > 0) {
        pendingInline.push(...t.tokens);
      } else {
        pendingInline.push({ type: "text", raw: t.raw, text: t.text } as Tokens.Generic);
      }
    } else if (child.type === "paragraph") {
      flushInline();
      const p = child as Tokens.Paragraph;
      blocks.push({ type: "paragraph", content: convertInline(p.tokens, state) });
    } else if (child.type === "list") {
      flushInline();
      blocks.push(convertList(child as Tokens.List, state));
    } else if (child.type === "code") {
      flushInline();
      blocks.push(convertCode(child as Tokens.Code));
    } else if (child.type === "space") {
      flushInline();
    } else {
      flushInline();
      const converted = convertBlock(child, state);
      if (converted) blocks.push(converted);
    }
  }
  flushInline();
  if (blocks.length === 0) {
    blocks.push({ type: "paragraph", content: [] });
  }
  return blocks;
}

function convertCode(token: Tokens.Code): ADFBlock {
  const lang = (token.lang ?? "").trim();
  const node: ADFBlock = {
    type: "codeBlock",
    content: [{ type: "text", text: token.text }],
  };
  if (lang) {
    (node as { attrs?: { language?: string } }).attrs = { language: lang };
  }
  return node;
}

function convertBlockquote(token: Tokens.Blockquote, state: ConverterState): ADFBlock {
  const inner: ADFBlock[] = [];
  for (const child of token.tokens) {
    const converted = convertBlock(child, state);
    if (converted) inner.push(converted);
  }
  return { type: "blockquote", content: inner };
}

function convertTable(token: Tokens.Table, state: ConverterState): ADFBlock {
  const rows: ADFTableRow[] = [];
  const headerCells: ADFTableCell[] = token.header.map((cell) => ({
    type: "tableHeader",
    content: [{ type: "paragraph", content: convertInline(cell.tokens, state) }],
  }));
  rows.push({ type: "tableRow", content: headerCells });
  for (const row of token.rows) {
    const cells: ADFTableCell[] = row.map((cell) => ({
      type: "tableCell",
      content: [{ type: "paragraph", content: convertInline(cell.tokens, state) }],
    }));
    rows.push({ type: "tableRow", content: cells });
  }
  return { type: "table", content: rows };
}

function convertBlock(token: Tokens.Generic, state: ConverterState): ADFBlock | null {
  switch (token.type) {
    case "space":
      return null;
    case "heading": {
      const t = token as Tokens.Heading;
      const level = Math.min(Math.max(t.depth, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6;
      return {
        type: "heading",
        attrs: { level },
        content: convertInline(t.tokens, state),
      };
    }
    case "paragraph": {
      const t = token as Tokens.Paragraph;
      return { type: "paragraph", content: convertInline(t.tokens, state) };
    }
    case "code":
      return convertCode(token as Tokens.Code);
    case "blockquote":
      return convertBlockquote(token as Tokens.Blockquote, state);
    case "list":
      return convertList(token as Tokens.List, state);
    case "table":
      return convertTable(token as Tokens.Table, state);
    case "hr":
      return { type: "rule" };
    case "html": {
      const t = token as Tokens.HTML;
      state.warnings.push(`block html fallback: paragraph + raw text로 보존`);
      return { type: "paragraph", content: [{ type: "text", text: t.text }] };
    }
    default: {
      state.warnings.push(`unsupported block token: '${token.type}' → paragraph fallback`);
      const anyTok = token as { raw?: string; text?: string };
      const fallback = anyTok.text ?? anyTok.raw ?? "";
      return { type: "paragraph", content: fallback ? [{ type: "text", text: fallback }] : [] };
    }
  }
}

export function markdownToAdf(
  markdown: string,
  _options: { adfVersion?: number } = {}
): MarkdownToAdfResult {
  const state: ConverterState = { warnings: [], idCounter: 0 };
  const tokens = marked.lexer(markdown, { gfm: true });
  const content: ADFBlock[] = [];
  for (const tok of tokens) {
    const converted = convertBlock(tok, state);
    if (converted) content.push(converted);
  }
  return {
    adf: { version: ADF_VERSION, type: "doc", content },
    warnings: state.warnings,
  };
}
