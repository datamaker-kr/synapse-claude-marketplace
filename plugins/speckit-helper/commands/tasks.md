---
description: Decompose specifications and plans into executable, dependency-ordered tasks
argument-hint: "[feature-slug]"
allowed-tools: Read, Write, Edit, Glob, Grep
---

# /tasks — Decompose Specs & Plans into Executable Tasks

Break down specifications and technical plans into a structured, dependency-ordered
task list with phase grouping, parallelization markers, complexity estimates, and
full requirement traceability.

---

## Step 1: Setup

### 1.1 Resolve Feature Slug

- If an argument is provided, use it as the `<feature-slug>`.
- If no argument is provided:
  - Scan `.speckit/*/spec.md` for all existing specifications.
  - Select the most recently modified `spec.md`.
  - Extract its parent directory name as the `<feature-slug>`.

### 1.2 Read Required Documents

- Read `.speckit/<feature-slug>/spec.md` — **REQUIRED**.
- Read `.speckit/<feature-slug>/plan.md` — **REQUIRED**.
- If either file is missing, abort immediately:
  > "Cannot generate tasks: missing `<filename>` at `.speckit/<feature-slug>/`.
  > Run `/speckit-helper:spec` or `/speckit-helper:plan` first."

### 1.3 Read Optional Documents

Load the following if they exist (skip silently if absent):

- `.speckit/<feature-slug>/data-model.md` — entity definitions and relationships.
- `.speckit/<feature-slug>/contracts/*.md` — API endpoint contracts (read all files in directory).
- `.speckit/<feature-slug>/research.md` — technology decisions and library choices.

---

## Step 2: Extract Information

### 2.1 From spec.md

- **User Stories**: collect all user stories and their priority levels (P1, P2, P3).
  - P1 = must-have (MVP scope).
  - P2 = should-have.
  - P3 = nice-to-have.
- **Functional Requirements**: extract all FR-XXX identifiers and their descriptions.
- **Non-Functional Requirements**: extract all NFR-XXX identifiers and their descriptions.
- **Key Entities**: identify domain objects, actors, and resources mentioned.
- **Success Criteria**: extract measurable acceptance conditions.

### 2.2 From plan.md

- **Architecture Components**: list all components from the design.
- **Directory Structure**: note the planned file and folder layout.
- **Technology Stack**: language, framework, libraries, tools.
- **Implementation Notes**: any special patterns, constraints, or sequencing hints.

### 2.3 From data-model.md (if exists)

- **Entities**: name, attributes, types, constraints.
- **Relationships**: entity-to-entity mappings and cardinality.
- **Indexes**: any declared indexes or unique constraints.
- **Migrations**: any schema migration steps noted.

### 2.4 From contracts/ (if exists)

- **Endpoints**: method, path, description for each API endpoint.
- **Request/Response Schemas**: field names, types, validation rules.
- **Error Codes**: expected error responses and status codes.

### 2.5 From research.md (if exists)

- **Technology Decisions**: chosen libraries and tools with rationale.
- **Resolved Questions**: any clarifications that affect implementation.
- **Risk Mitigations**: strategies that may introduce additional tasks.

---

## Step 3: Generate Task List

### 3.1 Phase Ordering Rules

Organize all tasks into the following phases, strictly in order:

| Phase     | Name           | Purpose                                         |
|-----------|----------------|------------------------------------------------|
| Phase 1   | Setup          | Config, dependencies, project scaffolding       |
| Phase 2   | Foundation     | Data models, core services, middleware (BLOCKING)|
| Phase 3+  | User Stories   | Grouped by priority (P1 first), independently testable |
| Phase N-1 | Integration    | E2E tests, cross-story validation               |
| Phase N   | Finalization   | Docs, cleanup, deployment prep                  |

**BLOCKING** phases must be completed before any subsequent phase can begin.
Non-blocking phases may overlap where dependencies allow.

### 3.2 Task Format

Each task follows this exact format:

```
- [ ] T001 [P] [US1] path/to/file.ext — Description (S) [Spec §X.Y]
```

Where:
- `T001` — sequential task ID (T001, T002, ...).
- `[P]` — present if the task can be executed in parallel with adjacent tasks.
- `[US1]` — user story reference (if applicable); omit for infrastructure tasks.
- `path/to/file.ext` — the primary file to create or modify.
- `Description` — concise description of what the task accomplishes.
- `(S)` — complexity estimate: **(S)mall**, **(M)edium**, or **(L)arge**.
- `[Spec §X.Y]` — reference to the specification section this task fulfills.

### 3.3 Complexity Definitions

| Size     | Guideline                                                     |
|----------|---------------------------------------------------------------|
| (S)mall  | Single file, straightforward logic, < 50 lines of change     |
| (M)edium | 2-3 files, moderate logic or integration work, 50-200 lines  |
| (L)arge  | 4+ files, complex logic, significant testing, 200+ lines     |

### 3.4 Parallelization Markers

- Mark a task with `[P]` if it has no dependency on the immediately preceding task
  within the same phase.
- Tasks in different phases are never parallel (phases are sequential).
- Within a phase, consecutive `[P]` tasks form a parallelization group.

### 3.5 Checkpoint Gates

Insert a checkpoint gate between each phase:

```markdown
---
### Checkpoint: Phase N Complete
- [ ] All Phase N tasks pass their tests
- [ ] No regressions in existing functionality
- [ ] Code review completed (if applicable)
---
```

### 3.6 Dependency Notes

After the task list, add a "Dependencies" section:

```markdown
## Dependencies
- T003 depends on T001 (database schema must exist before seeding)
- T007 depends on T004, T005 (API endpoint requires both service and validator)
```

List every non-obvious dependency. Omit dependencies that are implicit from
phase ordering.

---

## Step 4: Validate Coverage

### 4.1 Requirement Mapping

- Build a mapping: every `FR-XXX` and `NFR-XXX` from the spec must appear in at
  least one task's `[Spec §X.Y]` reference.
- Every task must have a valid `[Spec §X.Y]` reference pointing back to the spec.

### 4.2 Gap Detection

- For any requirement that has no corresponding task, insert a gap marker:
  ```
  - [ ] T0XX [Gap] — FR-XXX: <requirement description> — No task assigned
  ```
- For any task whose `[Spec §X.Y]` reference is invalid, flag it:
  ```
  - [ ] T0XX [InvalidRef] path/to/file.ext — Description (M) [Spec §?.?]
  ```

### 4.3 Coverage Report

Print a coverage summary:

```
Coverage Report:
  Functional Requirements:     X of Y covered (Z gaps)
  Non-Functional Requirements: X of Y covered (Z gaps)
  User Stories:                X of Y with tasks assigned
  Total:                       X of Y requirements covered, Z gaps found
```

If gaps exist, recommend reviewing the spec or plan to address uncovered
requirements.

---

## Step 5: Write Output

### 5.1 Write Task File

Write `.speckit/<feature-slug>/tasks.md` with the following structure:

```markdown
# Tasks: <Feature Name>

> Generated from spec.md and plan.md
> Total: XX tasks | Phases: N | Parallelizable: XX tasks

## Phase 1: Setup
- [ ] T001 [P] config/env.ts — Initialize environment configuration (S) [Spec §1.1]
- [ ] T002 [P] package.json — Add required dependencies (S) [Spec §1.1]

---
### Checkpoint: Phase 1 Complete
- [ ] All Phase 1 tasks pass their tests
- [ ] No regressions in existing functionality
---

## Phase 2: Foundation
...

## Dependencies
- T005 depends on T003 (service requires data model)
...

## Coverage Report
...
```

### 5.2 Print Summary

Display a summary after writing:

```
Task Decomposition Complete:
  Total tasks:       XX
  Phase breakdown:   Phase 1 (X) | Phase 2 (X) | Phase 3 (X) | ...
  Parallelizable:    X of XX tasks (YY%)
  MVP scope (P1):    X tasks
  Estimated effort:  X small + Y medium + Z large
  Output:            .speckit/<feature-slug>/tasks.md
```

### 5.3 Suggest Next Steps

Print the following:

> Next steps:
> - Run `/speckit-helper:analyze` to validate the task plan against the codebase.
> - Run `/speckit-helper:implement` to begin executing tasks in order.
