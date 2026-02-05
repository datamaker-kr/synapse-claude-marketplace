---
description: Generate technical design and planning documents from specification
argument-hint: "[feature-slug]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch
---

# /plan — Generate Technical Design & Planning Documents

Transform a specification into actionable technical design documents including
architecture overview, component design, data models, API contracts, and a
quickstart guide.

---

## Step 1: Setup

### 1.1 Resolve Feature Slug

- If an argument is provided, use it as the `<feature-slug>`.
- If no argument is provided:
  - Scan `.speckit/*/spec.md` for all existing specifications.
  - Select the most recently modified `spec.md`.
  - Extract its parent directory name as the `<feature-slug>`.
  - If no spec.md files exist anywhere, abort with an error (see Error Handling).

### 1.2 Read the Specification

- Read `.speckit/<feature-slug>/spec.md`.
- If the file does not exist, abort immediately:
  > "No specification found at `.speckit/<feature-slug>/spec.md`. Run `/speckit-helper:spec <feature-slug>` first."

### 1.3 Read the Constitution (Optional)

- Check if `.speckit/constitution.md` exists.
- If it does, read it and store the principles for compliance verification in Step 4.
- If it does not exist, skip constitution checking and note this in the final summary.

### 1.4 Detect Project Tech Stack

Scan the project root for technology indicator files:

| File                | Stack / Language       |
|---------------------|------------------------|
| `package.json`      | Node.js / JavaScript   |
| `tsconfig.json`     | TypeScript             |
| `pyproject.toml`    | Python                 |
| `requirements.txt`  | Python                 |
| `go.mod`            | Go                     |
| `Cargo.toml`        | Rust                   |
| `pom.xml`           | Java (Maven)           |
| `build.gradle`      | Java / Kotlin (Gradle) |
| `Gemfile`           | Ruby                   |
| `composer.json`     | PHP                    |
| `mix.exs`           | Elixir                 |
| `*.csproj`          | C# / .NET              |

- Read detected config files to extract version numbers, dependencies, and framework choices.
- Build a tech stack summary object containing: language, framework, package manager,
  test framework, and notable libraries.
- If no tech stack files are found, prompt the user (see Error Handling).

### 1.5 Identify Existing Project Architecture

Scan for key directories and catalog what exists:

- `src/`, `lib/`, `app/`, `pkg/`, `internal/`, `cmd/`
- `tests/`, `test/`, `__tests__/`, `spec/`
- `docs/`, `config/`, `scripts/`, `migrations/`
- `components/`, `pages/`, `routes/`, `api/`, `services/`

For each directory found:
- List top-level files and subdirectories.
- Note naming conventions (camelCase, kebab-case, snake_case).
- Identify patterns (MVC, hexagonal, feature-based, layer-based).

Store findings as the architectural context for design decisions.

---

## Step 2: Phase 0 — Research (generate `research.md`)

### 2.1 Identify Open Questions

- Parse `spec.md` for any `[Clarification needed]` markers.
- For each marker:
  - Attempt to resolve it using context from the spec, tech stack, and architecture.
  - If resolvable, note the resolution and rationale.
  - If not resolvable, flag it as an open question requiring user input.

### 2.2 Technology Decisions

For each technology decision implied or required by the spec:

- Identify 2-3 viable alternatives.
- For each alternative, evaluate:
  - **Pros**: performance, ecosystem, community support, learning curve.
  - **Cons**: complexity, licensing, maintenance burden, lock-in risk.
  - **Compatibility**: with existing tech stack and architecture.
- Make a recommendation with clear rationale.
- Note any alternatives that were considered but rejected, and why.

### 2.3 Risk Evaluation

Assess risks across three categories:

1. **Technical Complexity**: areas of the spec that are hard to implement, novel
   algorithms, or unfamiliar patterns.
2. **Third-Party Dependency Risk**: external services, APIs, or libraries that
   could become unavailable, change, or introduce breaking updates.
3. **Security Concerns**: authentication/authorization requirements, data
   sensitivity, input validation needs, known vulnerability patterns.

For each risk, assign a severity (Low / Medium / High) and suggest a mitigation
strategy.

### 2.4 Write Research Output

Write `.speckit/<feature-slug>/research.md` with the following structure:

```markdown
# Research: <Feature Name>

## Open Questions
- [ ] Question 1 — Status: Resolved / Unresolved
  - Resolution: ...

## Technology Decisions
### Decision 1: <Topic>
| Alternative | Pros | Cons | Verdict |
|------------|------|------|---------|
| Option A   | ...  | ...  | Chosen  |
| Option B   | ...  | ...  | Rejected|

## Risk Assessment
| Risk | Category | Severity | Mitigation |
|------|----------|----------|------------|
| ...  | ...      | ...      | ...        |
```

---

## Step 3: Phase 1 — Design (generate `plan.md` and supporting docs)

### 3.1 Architecture Overview

- Define the high-level system components and their responsibilities.
- Describe interactions between components (data flow, control flow).
- Create a component diagram in text/ASCII or Mermaid format.
- Map components to the existing directory structure (or propose new directories).

### 3.2 Component Design

For each major component identified in the architecture:

- **Interface**: public API surface (functions, methods, events, hooks).
- **Implementation approach**: algorithms, patterns, data structures.
- **Dependencies**: other components, external libraries, services.
- **Error handling**: failure modes and recovery strategies.
- **Testing strategy**: unit test scope, mocks needed, edge cases.

### 3.3 Data Model (conditional)

If the feature involves data storage, persistence, or entity management:

- Generate `.speckit/<feature-slug>/data-model.md` containing:
  - Entity definitions with attributes and types.
  - Relationships between entities (one-to-one, one-to-many, many-to-many).
  - Indexes and constraints.
  - Migration strategy (if modifying existing data).
  - Example data for illustration.

### 3.4 API Contracts (conditional)

If the feature involves HTTP APIs, RPCs, or inter-service communication:

- For each endpoint group, generate `.speckit/<feature-slug>/contracts/<endpoint-group>.md`:
  - Endpoint definition: method, path, description.
  - Request schema: headers, query params, body (with types and validation rules).
  - Response schema: success body, status codes.
  - Error codes: code, HTTP status, message, resolution.
  - Example request/response pairs.
  - Rate limiting or throttling notes (if applicable).

### 3.5 Quickstart Guide

Generate `.speckit/<feature-slug>/quickstart.md` containing:

- Prerequisites (runtime versions, tools, accounts).
- Setup steps (install dependencies, configure environment, seed data).
- Integration guide (how this feature connects to the existing codebase).
- Verification steps (how to confirm the feature works after setup).

### 3.6 Write Plan Output

Write `.speckit/<feature-slug>/plan.md` with the full design:

```markdown
# Technical Plan: <Feature Name>

## Tech Stack
- Language: ...
- Framework: ...

## Architecture Overview
...

## Component Design
### Component 1: <Name>
- Responsibility: ...
- Interface: ...
- Implementation: ...

## Directory Structure
...

## Implementation Notes
...

## Open Items
...
```

---

## Step 4: Constitution Check

### 4.1 Verify Compliance

If `constitution.md` was loaded in Step 1.3:

- For each principle defined in the constitution:
  - Check whether the plan adheres to it.
  - Note compliance status: PASS, WARN, or FAIL.
- Compile results into a compliance table.

### 4.2 Flag Violations

- For any principle with status WARN or FAIL:
  - Describe the specific conflict between the plan and the principle.
  - Suggest a modification to bring the plan into compliance.
  - If compliance is impossible without changing the spec, flag it clearly.

### 4.3 Append to Plan

Add a "Constitution Compliance" section at the end of `plan.md`:

```markdown
## Constitution Compliance
| Principle | Status | Notes |
|-----------|--------|-------|
| ...       | PASS   | ...   |
```

---

## Step 5: Summary

### 5.1 Print Generated Files

List every file created or updated during this command:

```
Generated files:
  .speckit/<feature-slug>/research.md    — Technology research and risk assessment
  .speckit/<feature-slug>/plan.md        — Full technical design document
  .speckit/<feature-slug>/data-model.md  — Entity definitions and relationships (if applicable)
  .speckit/<feature-slug>/contracts/     — API endpoint contracts (if applicable)
  .speckit/<feature-slug>/quickstart.md  — Setup and integration guide
```

### 5.2 Suggest Next Step

Print the following:

> Next step: Run `/speckit-helper:tasks <feature-slug>` to decompose this plan
> into executable, dependency-ordered tasks.

---

## Error Handling

### spec.md Not Found

If `.speckit/<feature-slug>/spec.md` does not exist:
- Print: "Specification not found at `.speckit/<feature-slug>/spec.md`."
- Suggest: "Run `/speckit-helper:spec <feature-slug>` to create a specification first."
- Abort the command.

### No Tech Stack Detected

If no technology indicator files are found in the project root:
- Print: "Could not detect project tech stack automatically."
- Ask the user: "Please specify your primary language and framework (e.g., TypeScript + Next.js, Python + FastAPI)."
- Wait for user input before proceeding.

### Conflicting Constitution Principles

If two or more constitution principles conflict with each other in the context
of the current plan:
- Flag both principles and describe the conflict.
- Ask the user to clarify which principle takes precedence.
- Document the resolution in `plan.md` under the Constitution Compliance section.
