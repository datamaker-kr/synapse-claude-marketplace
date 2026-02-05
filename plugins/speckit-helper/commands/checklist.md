---
description: Generate quality checklists that validate specification completeness and clarity
argument-hint: "[feature-slug] [--domain ux|api|security|performance|data|all]"
allowed-tools: Read, Write, Edit, Glob
---

# /speckit-helper:checklist

Generate domain-specific quality checklists that validate whether a specification is
complete, clear, and actionable. These are **requirement tests**, not implementation
tests -- they verify the spec itself, not the code.

---

## Overview

Checklists are generated dynamically based on the actual content of `spec.md`. Each
checklist item is a yes/no question tied to a specific section of the specification.
Checklists serve as quality gates: unchecked items indicate areas where the spec may
need refinement before implementation begins.

---

## Workflow

### Step 1: Resolve Feature Slug and Parse Arguments

Extract the feature-slug and optional `--domain` flag from `$ARGUMENTS`.

- The first positional argument is the feature-slug.
- If `--domain <value>` is present, use that domain. Valid values:
  `ux`, `api`, `security`, `performance`, `data`, `all`.
- If `--domain` is not specified, default to `all`.
- If `$ARGUMENTS` is empty, use Glob to list directories under `.speckit/`:
  - If exactly one feature directory exists, use it with `--domain all`.
  - If multiple exist, ask the user to specify.
  - If none exist, stop: "No specifications found. Run `/speckit-helper:specify` first."

### Step 2: Read the Specification

Read `.speckit/<feature-slug>/spec.md`.

- If the file does not exist, stop:
  > "Cannot generate checklists: spec.md not found at `.speckit/<feature-slug>/spec.md`.
  > Run `/speckit-helper:specify` first."
- Parse the specification to extract:
  - All `FR-XXX` identifiers and their descriptions
  - All `NFR-XXX` identifiers and their descriptions
  - All `US-XXX` or `US[N]` user stories with their priorities
  - All entity names from the Key Entities section
  - All API endpoints mentioned (method + path)
  - All `SC-XXX` success criteria
  - The detected technology stack (if noted in the spec)

### Step 3: Determine Applicable Domains

If `--domain all`, auto-detect which domains are relevant to the feature:

| Domain | Include if... | Skip if... |
|--------|---------------|------------|
| `ux` | Spec mentions UI, frontend, user interface, pages, or components | CLI-only tool, backend-only service, no user-facing elements |
| `api` | Spec mentions endpoints, API, REST, GraphQL, or contracts/ exist | No API layer, library-only, CLI tool with no server |
| `security` | Spec mentions auth, passwords, tokens, encryption, or access control | Read-only public data display with no user input |
| `performance` | Spec mentions response time, throughput, concurrent users, or caching | Small utility, documentation-only, no runtime component |
| `data` | Spec mentions entities, models, database, migration, or data-model.md exists | No persistent data, stateless transformation |

If a specific `--domain` was provided, generate only that domain's checklist regardless
of auto-detection.

### Step 4: Generate Dynamic Questions per Domain

For each applicable domain, generate checklist questions by combining two sources:

#### Source A: Content-Driven Questions

These questions are derived from the actual content of `spec.md`. Reference the skill at
`skills/checklist-generation/references/question-patterns.md` for the full pattern catalog.

**For each FR-XXX:**
```
- [ ] Is FR-XXX measurable and independently testable? [Spec §3]
- [ ] Does FR-XXX have at least one acceptance criterion? [Spec §3]
```

**For each US[N]:**
```
- [ ] Are all edge cases covered for US[N]? [Spec §2]
- [ ] Does US[N] have both happy-path and error-path acceptance criteria? [Spec §2]
- [ ] Can US[N] be implemented and tested independently? [Spec §2]
```

**For each entity:**
```
- [ ] Is the [Entity] lifecycle fully specified (create, read, update, delete)? [Spec §5]
- [ ] Are all [Entity] attributes defined with types and constraints? [Spec §5]
- [ ] Are relationships between [Entity] and other entities documented? [Spec §5]
```

**For each endpoint:**
```
- [ ] Are error responses documented for [METHOD /path]? [Spec §3]
- [ ] Is authentication required for [METHOD /path]? If so, is it specified? [Spec §4]
```

**For each SC-XXX:**
```
- [ ] Is SC-XXX measurable with a specific numeric target? [Spec §6]
- [ ] Can SC-XXX be verified in an automated test? [Spec §6]
```

#### Source B: Domain-Specific Questions

These questions come from the domain knowledge base. Reference the skill at
`skills/checklist-generation/references/checklist-domains.md` for the full question bank.

Only include domain-specific questions that are relevant to the feature's scope. For example,
if the spec describes a CLI tool, skip UX questions about responsive design or animations.

**UX domain examples:**
```
- [ ] Are all user-facing states defined (loading, empty, error, success)? [Spec §3]
- [ ] Is keyboard navigation specified? [Spec §4]
- [ ] Are form validation messages specified for each input field? [Spec §3]
```

**API domain examples:**
```
- [ ] Is pagination specified for list endpoints? [Spec §3]
- [ ] Is API versioning strategy defined? [Spec §4]
- [ ] Are rate limiting rules specified per endpoint? [Spec §4]
```

**Security domain examples:**
```
- [ ] Is input validation defined for all user inputs? [Spec §3]
- [ ] Are session management rules defined (expiry, invalidation)? [Spec §4]
- [ ] Is audit logging specified for sensitive operations? [Spec §4]
```

**Performance domain examples:**
```
- [ ] Are response time targets defined per endpoint? [Spec §4]
- [ ] Are concurrent user targets stated? [Spec §4]
- [ ] Are caching strategies specified? [Spec §4]
```

**Data domain examples:**
```
- [ ] Are all entity relationships defined (1:1, 1:N, N:M)? [Spec §5]
- [ ] Is data migration strategy specified for existing data? [Spec §4]
- [ ] Is soft-delete vs. hard-delete policy defined? [Spec §5]
```

### Step 5: Write Checklist Files

For each applicable domain, write a checklist file to:
```
.speckit/<feature-slug>/checklists/<domain>.md
```

Create the `checklists/` directory if it does not exist.

Each checklist file follows this format:

```markdown
# [Domain] Quality Checklist

**Feature:** <feature-name>
**Generated:** <current date>
**Spec:** .speckit/<feature-slug>/spec.md
**Domain:** <domain name>

## Requirement Completeness
- [ ] Is FR-001 "<description>" measurable and testable? [Spec §3]
- [ ] Is FR-002 "<description>" measurable and testable? [Spec §3]
...

## User Story Coverage
- [ ] Are edge cases covered for US1 "<story summary>"? [Spec §2]
- [ ] Does US1 have happy-path and error-path criteria? [Spec §2]
...

## Entity Definitions
- [ ] Is the User lifecycle fully specified? [Spec §5]
- [ ] Are all User attributes defined with types? [Spec §5]
...

## [Domain-Specific Section Title]
- [ ] <Domain-specific question> [Spec §X]
- [ ] <Domain-specific question> [Spec §X]
...
```

**IMPORTANT:** These are REQUIREMENT TESTS. Each question validates whether the
specification document adequately covers a concern. They do NOT test whether code
has been implemented correctly. The distinction matters:

- Good: "Is input validation defined for the email field?" (tests the spec)
- Bad: "Does the email field reject invalid inputs?" (tests the implementation)

### Step 6: Handle Existing Checklists

If a checklist file already exists for a domain:

1. Read the existing checklist.
2. Preserve any items that have been checked off (`- [X]`).
3. Add new questions that were not in the previous version.
4. Remove questions that are no longer relevant (e.g., if an FR was deleted from spec).
5. Mark the checklist as regenerated with a new date.

This ensures that progress is not lost when checklists are regenerated after spec changes.

### Step 7: Print Summary

After all checklists are written, print a summary:

```
--- Checklists Generated ---

Feature:  <feature-slug>
Domains:  <list of domains generated>

| Domain      | Questions | File                                          |
|-------------|-----------|-----------------------------------------------|
| ux          | 14        | .speckit/<slug>/checklists/ux.md              |
| api         | 18        | .speckit/<slug>/checklists/api.md             |
| security    | 12        | .speckit/<slug>/checklists/security.md        |
| performance | 10        | .speckit/<slug>/checklists/performance.md     |
| data        | 11        | .speckit/<slug>/checklists/data.md            |
| **Total**   | **65**    |                                               |

Suggested next step:
  Review checklists and check off items that are adequately covered in the spec.
  For unchecked items, run `/speckit-helper:refine <feature-slug>` to improve the spec.
```

---

## Error Handling

### spec.md Not Found

If `.speckit/<feature-slug>/spec.md` does not exist:
- Print the error message from Step 2 and abort.
- Do NOT create empty checklist files.

### Invalid Domain Argument

If `--domain` value is not one of `ux`, `api`, `security`, `performance`, `data`, `all`:
- Print: "Invalid domain '<value>'. Valid options: ux, api, security, performance, data, all."
- Abort without generating any checklists.

### No Applicable Domains

If `--domain all` is used and auto-detection finds no applicable domains:
- Print: "No applicable domains detected for this feature. Try specifying a domain
  explicitly with `--domain <name>`."
- This is unlikely but possible for very abstract or incomplete specs.

### Write Permission Failure

If writing a checklist file fails:
- Print the specific file path that failed and the error.
- Continue generating remaining checklists (do not abort entirely).

---

## Notes

- Checklists are living documents. They should be regenerated after significant spec changes
  (e.g., after `/speckit-helper:refine` or `/speckit-helper:clarify`).
- The `/speckit-helper:implement` command checks checklists as a quality gate. Unchecked
  items generate warnings (not blocking errors) during implementation.
- Each `[Spec §X]` reference ties the question back to the relevant specification section,
  making it easy to locate the area that needs improvement.
- Domain auto-detection is conservative: when in doubt, include the domain rather than
  skip it. Users can always delete checklists for irrelevant domains.
