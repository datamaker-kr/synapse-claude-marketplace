// Splice 로직 단위 테스트 — Jira 호출 없이 ADF 조작만 검증.

import test from "node:test";
import { deepStrictEqual } from "node:assert/strict";
import { spliceAdfByMarkers } from "./ticket.js";
import type { ADFBlock, ADFDocument } from "../markdown-to-adf.js";

const MARKER_START = "<!-- sdd:start -->";
const MARKER_END = "<!-- sdd:end -->";

function marker(text: string): ADFBlock {
  return {
    type: "paragraph",
    content: [{ type: "text", text, marks: [{ type: "code" }] }],
  };
}

function paragraph(text: string): ADFBlock {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function emptyDoc(content: ADFBlock[]): ADFDocument {
  return { version: 1, type: "doc", content };
}

test("splice replaces content between existing markers, preserving outer blocks", () => {
  const doc = emptyDoc([
    paragraph("intro"),
    marker(MARKER_START),
    paragraph("OLD-1"),
    paragraph("OLD-2"),
    marker(MARKER_END),
    paragraph("outro"),
  ]);
  const newBlocks: ADFBlock[] = [paragraph("NEW")];
  const { doc: result, created } = spliceAdfByMarkers(doc, newBlocks, MARKER_START, MARKER_END);
  deepStrictEqual(created, false);
  deepStrictEqual(result, emptyDoc([
    paragraph("intro"),
    marker(MARKER_START),
    paragraph("NEW"),
    marker(MARKER_END),
    paragraph("outro"),
  ]));
});

test("splice appends marker block at end when markers absent", () => {
  const doc = emptyDoc([paragraph("only")]);
  const newBlocks: ADFBlock[] = [paragraph("ADDED")];
  const { doc: result, created } = spliceAdfByMarkers(doc, newBlocks, MARKER_START, MARKER_END);
  deepStrictEqual(created, true);
  deepStrictEqual(result, emptyDoc([
    paragraph("only"),
    marker(MARKER_START),
    paragraph("ADDED"),
    marker(MARKER_END),
  ]));
});

test("splice treats reversed-marker order as missing and appends fresh block", () => {
  const doc = emptyDoc([
    marker(MARKER_END),
    paragraph("middle"),
    marker(MARKER_START),
  ]);
  const newBlocks: ADFBlock[] = [paragraph("X")];
  const { created } = spliceAdfByMarkers(doc, newBlocks, MARKER_START, MARKER_END);
  deepStrictEqual(created, true);
});
