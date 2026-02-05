---
description: Update an existing specification with new information or changed requirements
argument-hint: "<feature-slug> <changes or new information>"
allowed-tools: Read, Write, Edit, Glob, AskUserQuestion
---

# /speckit-helper:refine

Update an existing specification with new information or changed requirements.

---

## Overview

This command modifies an existing specification to incorporate new requirements,
changed business rules, or additional information that has emerged since the spec
was originally written. It handles sequential ID assignment, downstream document
staleness tracking, and inline clarification of newly added content.

---

## Workflow

### Step 1: Parse Arguments

Extract the feature-slug and change description from `$ARGUMENTS`:

- The **first token** is the feature-slug.
- The **remaining text** is the change description.
- If only a feature-slug is provided with no change description, ask the user:
  > "What changes or new information do you want to add to the `<feature-slug>` spec?"
- If `$ARGUMENTS` is empty, print an error:
  > "Usage: `/speckit-helper:refine <feature-slug> <changes or new information>`"
  > "Example: `/speckit-helper:refine user-auth Add support for SSO via SAML`"

Verify that `.speckit/<feature-slug>/spec.md` exists. If not:
> "No specification found at `.speckit/<feature-slug>/spec.md`.
> Run `/speckit-helper:specify` to create one first."

### Step 2: Read Existing Artifacts

Read the current specification and check for related downstream documents:

1. **Read** `.speckit/<feature-slug>/spec.md` — the primary specification.
2. **Check** for the existence of these downstream artifacts using Glob:
   - `.speckit/<feature-slug>/plan.md` — implementation plan
   - `.speckit/<feature-slug>/tasks.md` — task breakdown
   - `.speckit/<feature-slug>/checklists/*.md` — quality checklists
   - `.speckit/<feature-slug>/design.md` — design document
   - `.speckit/<feature-slug>/api.md` — API specification

Record which downstream documents exist; they will need staleness warnings.

Parse the current spec to identify:
- The highest existing FR ID (e.g., if FR-005 exists, next is FR-006)
- The highest existing NFR ID
- The highest existing US ID
- The highest existing SC ID
- The current version number from the Changelog

### Step 3: Apply Changes to spec.md

Based on the user's change description, modify the specification:

**Adding New Functional Requirements**
- Assign the next sequential FR ID (e.g., FR-006, FR-007).
- Place new FRs in the appropriate logical group within the Functional
  Requirements section.
- Each new FR must have: ID, description, priority (P1/P2/P3).
- Mark any unclear aspects with `[Clarification needed]`.

**Adding New Non-Functional Requirements**
- Assign the next sequential NFR ID.
- Include the category (Performance, Security, Scalability, etc.).
- Include measurable criteria where possible.

**Adding or Modifying User Stories**
- For new stories, assign the next sequential US ID.
- Each new story must follow the format:
  > As a [role], I want [action] so that [benefit].
- Include acceptance criteria in Given/When/Then format.
- Assign priority (P1/P2/P3).

**Modifying Existing Requirements**
- When updating an existing FR, NFR, or US, preserve the original ID.
- Clearly mark what changed (add an inline note if helpful):
  > `<!-- Refined on <DATE>: updated from "..." to "..." -->`
- Update related acceptance criteria to match the modification.

**Updating Success Criteria**
- Add new SC entries with sequential IDs if new success criteria emerge.
- Update existing SC entries if requirements they reference have changed.

Use the Edit tool for all modifications to preserve unchanged content.

### Step 4: Mark Downstream Documents as Stale

For each downstream document found in Step 2 (`plan.md`, `tasks.md`, etc.),
add a stale warning comment at the very top of the file:

```markdown
> ⚠️ This document may be stale. Spec was refined on [DATE]. Re-run the relevant command to regenerate.
```

Where `[DATE]` is the current date in YYYY-MM-DD format.

Rules for staleness warnings:
- If a stale warning already exists, **replace** it with the updated date
  (do not stack multiple warnings).
- Use the Edit tool to prepend or replace the warning.
- Do NOT modify any other content in the downstream documents.

### Step 5: Inline Clarification for New Content

Analyze only the **newly added** content for ambiguities:

- Scan new FRs, NFRs, user stories, and acceptance criteria for vague language
  (same criteria as `/speckit-helper:clarify`).
- If ambiguities are found in the new additions, use **AskUserQuestion** to
  ask up to 3 targeted clarification questions about the new content only.
- Apply the user's answers to tighten the newly added requirements.
- Mark any unresolved items with `[Clarification needed]`.

This step is scoped to new content only. It does NOT re-analyze the entire
specification. For a full clarification pass, use `/speckit-helper:clarify`.

### Step 6: Update the Changelog

Append a new entry to the Changelog table at the bottom of `spec.md`:

| Date       | Version | Author | Description                         |
|------------|---------|--------|-------------------------------------|
| YYYY-MM-DD | vX.Y.Z  | User   | Refined: <brief summary of changes> |

Version increment rules:
- **Minor version bump** (e.g., v0.1.0 -> v0.2.0) for new requirements or
  user stories added.
- **Patch version bump** (e.g., v0.2.0 -> v0.2.1) for modifications to
  existing requirements without adding new ones.

### Step 7: Print Summary

After all changes are applied, print a summary:

```
--- Specification Refined ---

Feature:    <feature-slug>
Spec:       .speckit/<feature-slug>/spec.md
Version:    <old-version> -> <new-version>

Changes applied:
  - Added <N> new functional requirements (FR-XXX to FR-YYY)
  - Added <N> new non-functional requirements
  - Added/modified <N> user stories
  - Updated <N> success criteria
  - Resolved <N> inline clarifications

Downstream documents marked stale:
  - .speckit/<feature-slug>/plan.md
  - .speckit/<feature-slug>/tasks.md
  (Re-run the relevant commands to regenerate these)

Suggested next steps:
  /speckit-helper:clarify <feature-slug>   (full clarification pass)
  /speckit-helper:analyze <feature-slug>   (gap analysis on updated spec)
  /speckit-helper:plan <feature-slug>      (regenerate implementation plan)
```

---

## Notes

- Refinement is for evolving specifications. It preserves existing content and
  adds or modifies incrementally.
- The staleness warnings on downstream documents are critical for maintaining
  consistency across the spec ecosystem.
- Newly added content goes through a mini-clarification pass automatically,
  but a full `/speckit-helper:clarify` may still be beneficial after major
  refinements.
- If the refinement contradicts existing requirements, flag the conflict
  explicitly and ask the user to resolve it rather than silently overwriting.
