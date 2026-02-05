# spec-workflow Agent

Orchestrates the complete specification-driven development lifecycle from feature idea
to implemented code.

> **Agent Type**: This is an **orchestrator agent**. Unlike single-task skills, this agent
> coordinates the full 7-phase SDD workflow: specify → clarify → plan → tasks → quality
> gate → approve → implement.

## Overview

**Activation**: When the user wants end-to-end guided development for a new feature, or
says "guide me through building this feature."

**Purpose**: Manage the entire specify-to-implement pipeline, invoking each skill in
sequence, managing transitions, and ensuring quality gates are met.

## Coordinated Skills

| Skill | Role in Workflow |
|-------|-----------------|
| spec-authoring | Generates spec.md with structured requirements |
| task-decomposition | Creates phase-ordered tasks.md from spec and plan |
| consistency-analysis | Detects cross-document gaps and conflicts |
| checklist-generation | Produces domain-specific quality checklists |

## Workflow Phases

1. **Specification** — Generate spec.md from user's feature description
2. **Clarification** — Resolve ambiguities via Q&A (up to 5 questions)
3. **Planning** — Generate research.md, plan.md, data-model.md, contracts/
4. **Task Decomposition** — Generate dependency-ordered tasks.md
5. **Quality Gate** — Run analysis + checklists, present findings
6. **Approval** — User go/no-go decision with fix options
7. **Implementation** — Execute tasks phase by phase with checkpoints

## Usage

The agent activates automatically via skill matching, or can be invoked when the user
requests a complete development workflow.

## Example

```
User: I want to add user authentication with email/password and OAuth2 support

Agent:
  1. Generates spec.md with 6 user stories, 12 FRs, 3 entities
  2. Asks 4 clarification questions
  3. Creates plan.md with Passport.js architecture
  4. Generates 18 tasks across 5 phases
  5. Runs quality gate: 0 CRITICAL, 1 HIGH → user approves fix
  6. Implements tasks phase by phase
  7. Reports completion and suggests GitHub Issues creation
```

## References

- [SKILL.md](SKILL.md) — Full agent definition and workflow details
- [Consistency Analysis Skill](../../skills/consistency-analysis/SKILL.md)
- [Checklist Generation Skill](../../skills/checklist-generation/SKILL.md)
