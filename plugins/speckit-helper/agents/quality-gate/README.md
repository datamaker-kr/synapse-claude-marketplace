# quality-gate Agent

Runs consistency analysis and checklist validation as a quality checkpoint before
implementation.

> **Agent Type**: This is an **orchestrator agent**. Unlike single-task skills, this agent
> coordinates a 4-phase quality validation workflow: analyze → checklist → report →
> suggest fixes.

## Overview

**Activation**: When the user asks to validate specification quality, check readiness for
implementation, or says "is my spec ready?"

**Purpose**: Provide a combined quality assessment with pass/fail recommendation and
actionable fix suggestions.

## Coordinated Skills

| Skill | Role in Workflow |
|-------|-----------------|
| consistency-analysis | Detects gaps, conflicts, and issues across documents |
| checklist-generation | Generates domain-specific requirement checklists |

## Workflow Phases

1. **Consistency Analysis** — Run 8 cross-document checks with severity classification
2. **Checklist Generation** — Auto-detect domains and generate quality checklists
3. **Combined Report** — Merge findings into unified quality report with PASS/WARN/FAIL
4. **Fix Suggestions** — Provide actionable recommendations ordered by severity

## Pass/Fail Criteria

| Status | Condition |
|--------|-----------|
| PASS | 0 CRITICAL, 0 HIGH findings |
| WARN | 0 CRITICAL, 1+ HIGH findings |
| FAIL | 1+ CRITICAL findings |

## Usage

The agent activates automatically when the user asks about spec quality, or can be
invoked explicitly before starting implementation.

## Example

```
User: Check if my user-authentication spec is ready

Agent:
  1. Catalogs 5 documents (spec, plan, tasks, data-model, constitution)
  2. Runs 7/8 checks (1 skipped: no contracts found)
  3. Results: 0 CRITICAL, 1 HIGH, 3 MEDIUM, 2 LOW → WARN
  4. Generates 4 domain checklists (55 questions)
  5. Reports: "1 HIGH finding — OAuth provider list incomplete"
  6. User approves fix → re-analysis → PASS
```

## References

- [SKILL.md](SKILL.md) — Full agent definition and workflow details
- [Analysis Rules](../../skills/consistency-analysis/references/analysis-rules.md)
- [Severity Levels](../../skills/consistency-analysis/references/severity-levels.md)
