---
description: Clarify ambiguous areas in specifications through targeted Q&A
argument-hint: "[feature-slug] (defaults to most recent spec)"
allowed-tools: Read, Write, Edit, Glob, AskUserQuestion
---

# /speckit-helper:clarify

Clarify ambiguous areas in an existing specification through targeted Q&A.

---

## Overview

This command analyzes an existing specification for vague language, missing edge
cases, undefined terms, and unresolved questions. It generates targeted clarification
questions, collects answers from the user, and updates the spec inline. The goal is
to tighten the specification without expanding its scope.

---

## Workflow

### Step 1: Resolve Feature Slug

Determine which specification to clarify:

- **If a feature-slug is provided in `$ARGUMENTS`:** Use it directly. Verify that
  `.speckit/<feature-slug>/spec.md` exists. If not, print an error:
  > "No specification found at `.speckit/<feature-slug>/spec.md`. Run
  > `/speckit-helper:specify` to create one first."
- **If `$ARGUMENTS` is empty:** Find the most recently modified spec by scanning
  all `.speckit/*/spec.md` files using Glob. Sort by modification time and select
  the newest one. Print which spec was auto-selected:
  > "Auto-selected most recent spec: `<feature-slug>`"
- **If no specs exist at all:** Print an error:
  > "No specifications found in `.speckit/`. Run `/speckit-helper:specify` first."

### Step 2: Read the Specification

Read the full contents of `.speckit/<feature-slug>/spec.md`.

Parse and identify the following sections for analysis:
- User Stories and their acceptance criteria
- Functional Requirements (FR-*)
- Non-Functional Requirements (NFR-*)
- Assumptions & Constraints
- Open Questions
- Any text marked with `[Clarification needed]`

### Step 3: Analyze for Ambiguities

Scan the specification for the following categories of ambiguity:

**Vague Language**
Flag any requirements or acceptance criteria containing:
- "should" (instead of "must" or "shall")
- "might", "may", "could" (uncertain commitment)
- "approximately", "roughly", "around" (imprecise quantities)
- "etc.", "and so on", "and more" (open-ended lists)
- "appropriate", "suitable", "reasonable" (subjective terms)
- "fast", "quick", "efficient" (unmeasurable performance)

**Missing Edge Cases**
Identify requirements that lack:
- Error handling behavior
- Boundary conditions (empty input, max limits, concurrent access)
- Failure and recovery scenarios
- Permission and authorization edge cases

**Undefined Terms**
Find domain-specific terms or acronyms used but never defined in the spec.

**Unresolved Markers**
Locate all instances of:
- `[Clarification needed]` markers
- Unchecked `[ ]` items in Open Questions
- TODO or TBD placeholders

### Step 4: Generate Clarification Questions

From the analysis, generate up to **5** targeted clarification questions.

Prioritize questions by impact:
1. Questions that block multiple requirements (highest priority)
2. Questions about core user stories (P1 priority stories)
3. Questions about undefined terms used frequently
4. Questions about missing edge cases in critical flows
5. Questions about vague NFRs (e.g., "What does 'fast' mean in SC-001?")

Format each question clearly with context:
> **Q1 (FR-003):** The requirement says users "should be able to export data."
> Does this mean export is mandatory (must) or optional (should)? What formats
> are required?

Use the **AskUserQuestion** tool to present questions to the user and collect
answers. Ask questions one at a time or in a small batch (no more than 5).

### Step 5: Update the Specification

Apply the user's answers to the specification by editing `.speckit/<feature-slug>/spec.md`:

- **Add detail** to the relevant sections based on the user's responses.
- **Replace vague language** with precise language (e.g., "should" -> "must",
  "fast" -> "under 200ms").
- **Resolve `[Clarification needed]` markers** by replacing them with the
  clarified content.
- **Check off resolved Open Questions** by changing `[ ]` to `[x]` and
  adding the resolution inline.
- **Add edge case handling** to acceptance criteria where the user confirmed
  the expected behavior.
- **Update the Changelog** table with an entry:
  - Date: current date
  - Version: increment patch (e.g., v0.1.0 -> v0.1.1)
  - Description: "Clarification pass: resolved N items"

Use the Edit tool for inline modifications to preserve the rest of the document.

### Step 6: Anti-Scope-Creep Guard

**IMPORTANT:** This step is a strict constraint on the clarification process.

- ONLY clarify existing requirements. Do NOT add new features or requirements.
- If the user's answer implies a new feature, note it in Open Questions instead
  of adding it to the requirements:
  > `[ ] User suggested: <new feature idea> (out of scope for this clarification)`
- If the user wants to add new requirements, direct them to use:
  > `/speckit-helper:refine <feature-slug> <new requirement description>`
- Do NOT increase the scope of user stories beyond their original intent.
- Do NOT add new user stories, FRs, or NFRs during clarification.

### Step 7: Print Summary

After all updates are applied, print a summary:

```
--- Clarification Complete ---

Feature:    <feature-slug>
Spec:       .speckit/<feature-slug>/spec.md

Changes made:
  - Resolved <N> ambiguous terms
  - Clarified <N> requirements
  - Answered <N> open questions
  - Remaining open questions: <N>
  - Remaining [Clarification needed] markers: <N>

Suggested next steps:
  /speckit-helper:clarify <feature-slug>   (if items remain)
  /speckit-helper:analyze <feature-slug>   (run gap analysis)
  /speckit-helper:refine <feature-slug>    (add new requirements)
```

---

## Notes

- This command can be run multiple times on the same spec. Each pass should
  reduce the number of ambiguities.
- The anti-scope-creep guard is essential: clarification must only sharpen
  existing requirements, never expand them.
- If the user declines to answer a question, leave the existing text as-is
  and keep the `[Clarification needed]` marker or open question intact.
- Questions should reference specific requirement IDs (FR-001, NFR-002, etc.)
  so the user has full context when answering.
