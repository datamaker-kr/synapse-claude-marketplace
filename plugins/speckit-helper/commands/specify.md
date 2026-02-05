---
description: Create a feature specification from natural language requirements
argument-hint: "<feature description or requirements>"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# /speckit-helper:specify

Create a structured feature specification from natural language requirements.

---

## Overview

This command transforms a natural language feature description into a comprehensive,
structured specification document. It scaffolds the `.speckit/` directory structure,
generates a `spec.md` from a canonical template, and creates an initial requirements
checklist to track quality gates.

---

## Workflow

### Step 1: Parse Input

Read the feature description from `$ARGUMENTS`.

- If `$ARGUMENTS` is non-empty, use it as the feature description.
- If `$ARGUMENTS` is empty, stop and ask the user:
  > "Please describe the feature you want to specify. Include the problem it solves,
  > who it's for, and any key constraints."
- Store the raw description for use in subsequent steps.

### Step 2: Generate Feature Slug

Derive a slug from the feature description:

- Convert the description to lowercase.
- Extract 2-4 key words that capture the essence of the feature.
- Join them with hyphens (kebab-case).
- Remove any special characters; only allow `[a-z0-9-]`.
- Examples:
  - "User authentication with OAuth2" -> `user-authentication`
  - "Add a dark mode toggle to settings" -> `dark-mode-toggle`
  - "Real-time collaborative editing" -> `realtime-collab-editing`
  - "CSV export for reports" -> `csv-report-export`

### Step 3: Detect Project Type

Scan the repository root to identify the technology stack. Check for the following
marker files and note the detected stack for contextual spec generation:

| Marker File          | Detected Stack        |
|----------------------|-----------------------|
| `package.json`       | Node.js / TypeScript  |
| `pyproject.toml`     | Python                |
| `setup.py`           | Python                |
| `go.mod`             | Go                    |
| `Cargo.toml`         | Rust                  |
| `pom.xml`            | Java                  |
| `*.csproj`           | C# / .NET             |

Use Glob to search for these files at the project root. If multiple are found,
note all detected stacks. If none are found, proceed with a language-agnostic
specification. Record the detected stack(s) so the spec can reference appropriate
conventions, tooling, and patterns.

### Step 4: Create Directory Structure

Use Bash to create the required directories:

```bash
mkdir -p .speckit/<feature-slug>/checklists/
```

This creates the full path including:
- `.speckit/` — project-level spec root
- `.speckit/<feature-slug>/` — feature-specific directory
- `.speckit/<feature-slug>/checklists/` — quality checklists for this feature

### Step 5: Load Spec Template

Read the spec template from the plugin's skill reference file located at the plugin
installation path. Look for the template in the plugin's `skills/` directory.

The template structure MUST include the following sections:

1. **Feature Overview**
   - Feature name, slug, status (Draft), created date
   - Brief description (1-2 paragraphs)
   - Detected technology stack

2. **User Stories**
   - Each story has: ID (US-001+), priority (P1/P2/P3), role, action, benefit
   - Acceptance criteria in Given/When/Then format per story
   - P1 = Must have, P2 = Should have, P3 = Nice to have

3. **Functional Requirements**
   - Sequential IDs: FR-001, FR-002, FR-003, ...
   - Each requirement: ID, description, priority, acceptance criteria
   - Group by logical domain where applicable

4. **Non-Functional Requirements**
   - Sequential IDs: NFR-001, NFR-002, NFR-003, ...
   - Categories: Performance, Security, Scalability, Accessibility, etc.
   - Measurable criteria where possible (e.g., "Response time < 200ms")

5. **Key Entities**
   - Domain entities referenced in the feature
   - Attributes and relationships
   - Presented as a simple table or list

6. **Success Criteria**
   - Sequential IDs: SC-001, SC-002, SC-003, ...
   - Measurable outcomes that determine feature completeness
   - Tied back to user stories and requirements

7. **Assumptions & Constraints**
   - Technical assumptions (e.g., "Database supports JSON columns")
   - Business constraints (e.g., "Must comply with GDPR")
   - Dependency assumptions (e.g., "Auth service is available")

8. **Open Questions**
   - Items needing clarification before implementation
   - Each marked with `[ ]` checkbox for tracking resolution
   - Assigned to a stakeholder where possible

9. **Changelog**
   - Table with columns: Date, Version, Author, Description
   - Initial entry: creation date, v0.1.0, "Initial draft"

### Step 6: Generate spec.md

Fill the template with content derived from the user's feature description:

- Analyze the description to extract user stories, requirements, and entities.
- Infer reasonable functional and non-functional requirements from context.
- Mark any areas where information is incomplete with `[Clarification needed]`.
- Write the completed specification to:
  ```
  .speckit/<feature-slug>/spec.md
  ```
- The spec should be thorough but honest about gaps. Do NOT fabricate details
  that cannot be reasonably inferred from the user's description.

### Step 7: Generate Initial Requirements Checklist

Create `.speckit/<feature-slug>/checklists/requirements.md` with a baseline
quality checklist:

```markdown
# Requirements Quality Checklist

**Feature:** <feature-name>
**Spec Version:** v0.1.0
**Last Checked:** <date>

## Completeness
- [ ] All user stories have acceptance criteria
- [ ] All functional requirements have clear descriptions
- [ ] Non-functional requirements include measurable thresholds
- [ ] Key entities are identified with attributes
- [ ] Success criteria are defined and measurable

## Clarity
- [ ] No ambiguous language ("should", "might", "could", "approximately")
- [ ] All domain terms are defined or referenced
- [ ] Requirements are testable as written
- [ ] No circular or contradictory requirements

## Traceability
- [ ] Each requirement has a unique ID
- [ ] User stories link to requirements
- [ ] Success criteria trace to user stories

## Feasibility
- [ ] Technology stack is identified
- [ ] No requirements conflict with known constraints
- [ ] Dependencies are documented
- [ ] Open questions are captured for follow-up
```

### Step 8: Print Summary and Suggest Next Step

After all files are created, print a summary:

```
--- Specification Created ---

Feature:    <feature-name>
Slug:       <feature-slug>
Stack:      <detected-stack or "Not detected">

Files created:
  .speckit/<feature-slug>/spec.md
  .speckit/<feature-slug>/checklists/requirements.md

Spec includes:
  - <N> user stories
  - <N> functional requirements
  - <N> non-functional requirements
  - <N> open questions

Suggested next step:
  /speckit-helper:clarify <feature-slug>
  (Resolve ambiguities and open questions in the spec)
```

---

## Error Handling

### Directory Already Exists

If `.speckit/<feature-slug>/` already exists:
- Warn the user: "A spec for `<feature-slug>` already exists."
- Ask whether to:
  1. **Overwrite** — replace the existing spec entirely
  2. **Rename** — generate an alternative slug (e.g., append `-v2`)
  3. **Cancel** — abort the operation
- Do NOT silently overwrite existing specifications.

### No Write Permissions

If directory creation or file writing fails due to permissions:
- Print a clear error message identifying the path that failed.
- Suggest the user check file system permissions on the project directory.
- Do NOT retry automatically.

### Empty Arguments

If `$ARGUMENTS` is empty and the user does not provide a description when prompted:
- Print: "Cannot create a specification without a feature description. Please run the command again with a description."
- Exit gracefully without creating any files or directories.

---

## Notes

- All generated specs start at version `v0.1.0` with status `Draft`.
- The `[Clarification needed]` markers are designed to be resolved by
  `/speckit-helper:clarify`.
- The requirements checklist is a living document that should be re-evaluated
  after each spec refinement.
- If a `.speckit/constitution.md` exists, the generated spec should note
  compliance with project-level principles where applicable.
