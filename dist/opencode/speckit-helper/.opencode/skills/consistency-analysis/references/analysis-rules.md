# Consistency Analysis Rules

Rules for cross-document analysis performed by `/speckit-helper:analyze`.

## Rule Categories

### 1. Requirement Coverage

Every functional and non-functional requirement in `spec.md` must map to at least one task in `tasks.md`.

**Check:** For each `FR-XXX` and `NFR-XXX` in spec.md, search tasks.md for `[Spec §X.Y]` references that cover it.

**Finding if missing:**
```
[HIGH] FR-003 "rate limiting on login" has no corresponding task in tasks.md
```

### 2. Task Traceability

Every task in `tasks.md` must reference a valid spec section.

**Check:** For each task with `[Spec §X.Y]`, verify that section X.Y exists in spec.md and contains a relevant requirement.

**Finding if invalid:**
```
[MEDIUM] T008 references [Spec §5.2] but section 5.2 does not exist in spec.md
```

### 3. Plan Alignment

Architecture decisions in `plan.md` must be reflected in task file paths and descriptions.

**Check:**
- If plan.md says "use repository pattern" → tasks should include repository files
- If plan.md specifies a directory structure → task paths should match
- If plan.md lists components → each component should have tasks

**Finding if misaligned:**
```
[HIGH] plan.md specifies "src/repositories/" pattern but no task creates files in that directory
```

### 4. Data Model Consistency

Entities defined in `data-model.md` must be referenced in tasks.

**Check:** For each entity in data-model.md, verify:
- A task creates the model file
- A task implements CRUD operations (if applicable)
- Attributes listed in data-model.md match what's referenced in tasks

**Finding if inconsistent:**
```
[MEDIUM] Entity "OAuthLink" defined in data-model.md has no creation task in tasks.md
```

### 5. Contract Coverage

Every API endpoint defined in `contracts/*.md` must have an implementation task.

**Check:** For each endpoint in contracts/, verify:
- A task implements the endpoint handler
- Request/response schemas match data-model.md entities
- Error responses are covered

**Finding if missing:**
```
[HIGH] Endpoint "POST /api/auth/refresh" defined in contracts/auth.md has no implementation task
```

### 6. Constitution Compliance

If `.speckit/constitution.md` exists, all documents must comply with stated principles.

**Check:** For each principle in constitution.md:
- Plan.md doesn't violate architectural principles
- Tasks include test tasks if constitution requires TDD
- No requirement contradicts quality thresholds

**Finding if violated:**
```
[CRITICAL] Constitution principle "Minimum 80% test coverage" but only 2 of 12 tasks are test tasks
```

### 7. Duplication Detection

Same requirement stated differently across documents.

**Check:** Compare requirement descriptions in spec.md for semantic overlap.

**Finding if duplicated:**
```
[LOW] FR-002 "hash passwords with bcrypt" and NFR-002 "passwords must be encrypted" overlap — consider consolidating
```

### 8. Ambiguity Detection

Requirements that use vague or unmeasurable language.

**Check:** Scan spec.md for: "should", "might", "could", "may", "ideally", "approximately", "etc.", "as needed", "as appropriate".

**Finding if ambiguous:**
```
[MEDIUM] FR-004 uses "should support multiple providers" — which providers? How many? Use "must" with specific list
```

## Report Output Format

```markdown
## Consistency Analysis Report

**Feature:** [feature-slug]
**Date:** [DATE]
**Documents Analyzed:** spec.md, plan.md, tasks.md, data-model.md, contracts/

### Summary
- CRITICAL: X findings
- HIGH: X findings
- MEDIUM: X findings
- LOW: X findings

### Findings

#### CRITICAL
1. [Finding description with document references]

#### HIGH
1. [Finding description]
2. [Finding description]

#### MEDIUM
...

### Recommendations
- Run `/speckit-helper:refine` to address CRITICAL and HIGH findings
- Use `/speckit-helper:tasks` to regenerate task list after spec updates
```
