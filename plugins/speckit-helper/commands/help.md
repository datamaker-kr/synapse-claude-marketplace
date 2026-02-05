---
description: Show all available Speckit Helper commands, workflow, and quick-start guide
allowed-tools: Read
---

# /speckit-helper:help

Display all available commands, the recommended workflow, and contextual guidance for
Speckit Helper — the Specification-Driven Development plugin.

---

## Behavior

When invoked, print the following information sections in order.

### Section 1: Header

```
Speckit Helper — Specification-Driven Development

Transform feature ideas into structured specifications, executable task lists,
and dependency-aware implementations.
```

### Section 2: Workflow Diagram

```
Workflow:

  specify → clarify → refine → plan → tasks → analyze → checklist → implement
     │                   ↑                        │              │
     │                   └── iterate ──────────────┘              │
     │                                                           │
     └── constitution (project-wide, run once) ──────────────────┘

  Post-implementation: tasks-to-issues (optional, creates GitHub Issues)
```

### Section 3: Command Reference Table

```
| Command                        | Description                                           |
|--------------------------------|-------------------------------------------------------|
| /speckit-helper:help           | Show this help and quick-start guide                  |
| /speckit-helper:specify        | Create feature spec from natural language description |
| /speckit-helper:clarify        | Resolve ambiguities via targeted Q&A                  |
| /speckit-helper:refine         | Update spec with new info or changed requirements     |
| /speckit-helper:constitution   | Define project-wide principles and quality standards  |
| /speckit-helper:plan           | Generate technical design and planning documents      |
| /speckit-helper:tasks          | Decompose specs into dependency-ordered task list     |
| /speckit-helper:analyze        | Check spec consistency, gaps, and quality (read-only) |
| /speckit-helper:checklist      | Generate domain-specific quality checklists           |
| /speckit-helper:implement      | Execute tasks with dependency-aware ordering          |
| /speckit-helper:tasks-to-issues| Convert tasks into GitHub Issues with labels          |
```

### Section 4: Quick Start

```
Quick Start:

  1. /speckit-helper:specify <your feature idea>
     Creates .speckit/<feature-slug>/spec.md with structured requirements.

  2. /speckit-helper:plan <feature-slug>
     Generates research.md, plan.md, data-model.md, and contracts.

  3. /speckit-helper:tasks <feature-slug>
     Breaks down the plan into phased, dependency-ordered tasks.

  4. /speckit-helper:implement <feature-slug>
     Implements tasks in order, marking each complete in tasks.md.
```

### Section 5: Skills Reference

```
Skills (auto-activate on trigger keywords):

| Skill                  | Triggers                                                     |
|------------------------|--------------------------------------------------------------|
| spec-authoring         | specification, requirements, user story, acceptance criteria |
| task-decomposition     | task list, work breakdown, dependency order, T001            |
| consistency-analysis   | consistency, gap analysis, conflict detection, traceability  |
| checklist-generation   | checklist, quality gate, requirement testing, validation     |
```

### Section 6: Agents Reference

```
Agents (orchestrate multi-step workflows):

  spec-workflow   End-to-end: specify → clarify → plan → tasks → analyze → implement
  quality-gate    Quality check: analyze → checklist → report → suggest fixes
```

### Section 7: Generated Artifacts

```
Generated artifacts (.speckit/ directory):

  .speckit/
  ├── constitution.md              Project-wide principles (shared)
  └── <feature-slug>/
      ├── spec.md                  Feature specification
      ├── research.md              Technology research & decisions
      ├── plan.md                  Technical design
      ├── data-model.md            Data model definitions
      ├── quickstart.md            Setup & integration guide
      ├── tasks.md                 Executable task list
      ├── contracts/               API contracts
      │   └── *.md
      └── checklists/              Quality checklists
          ├── requirements.md
          ├── ux.md
          ├── api.md
          ├── security.md
          ├── performance.md
          └── data.md
```

---

## User Request Routing

When a user asks a question or makes a request that matches one of the following patterns,
respond with targeted guidance pointing them to the appropriate command.

| User Says | Respond With |
|-----------|--------------|
| "I have a feature idea" / "I want to build something" | Guide to `/speckit-helper:specify` with example: `/speckit-helper:specify Add user authentication with email/password login` |
| "My spec is unclear" / "I need to improve the spec" | Guide to `/speckit-helper:clarify <slug>` then `/speckit-helper:refine <slug>` |
| "How do I plan the implementation?" | Guide to `/speckit-helper:plan <slug>` — explain it reads spec.md and generates plan.md, data-model.md, contracts |
| "Break this into tasks" / "What should I work on first?" | Guide to `/speckit-helper:tasks <slug>` — explain phase ordering and [P] markers |
| "Is my spec complete?" / "Check my spec quality" | Guide to `/speckit-helper:analyze <slug>` (read-only check) then `/speckit-helper:checklist <slug>` |
| "Start implementing" / "Build this feature" | Guide to `/speckit-helper:implement <slug>` — mention prerequisite: spec.md and tasks.md must exist |
| "Set up project rules" / "Define coding standards" | Guide to `/speckit-helper:constitution` — explain it creates .speckit/constitution.md |
| "Create GitHub issues from tasks" | Guide to `/speckit-helper:tasks-to-issues <slug> --dry-run` first, then without --dry-run |
| "Show me the full workflow" | Print the workflow diagram from Section 2 with Example A walkthrough |
| "What files does speckit generate?" | Print the artifact tree from Section 7 with descriptions |

---

## Notes

- This command is read-only. It does not modify any files.
- The command reference and workflow are printed directly to the user's terminal.
- If the user asks for help about a specific command, read that command's .md file from
  the commands/ directory and summarize its purpose, arguments, and workflow steps.
