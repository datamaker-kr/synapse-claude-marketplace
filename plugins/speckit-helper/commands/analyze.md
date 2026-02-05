---
description: Analyze specifications for consistency, gaps, and quality issues (read-only)
argument-hint: "[feature-slug]"
allowed-tools: Read, Glob, Grep
---

# /speckit-helper:analyze

Perform a comprehensive read-only consistency analysis across all specification documents
for a given feature.

---

## IMPORTANT: Read-Only Constraint

This command MUST NEVER modify any files. Only the Read, Glob, and Grep tools are
permitted. All findings are reported for human review. If changes are needed, suggest
the appropriate command (`/speckit-helper:refine`, `/speckit-helper:tasks`, etc.).

---

## Workflow

### Step 1: Resolve Feature Slug

Determine the feature-slug from `$ARGUMENTS`.

- If `$ARGUMENTS` is non-empty, use the first positional argument as the feature-slug.
- If `$ARGUMENTS` is empty, use Glob to list directories under `.speckit/`:
  - If exactly one feature directory exists, use it automatically.
  - If multiple exist, list them and ask the user to choose:
    > "Multiple features found. Please specify a feature slug: [list]"
  - If none exist, stop with:
    > "No specifications found. Run `/speckit-helper:specify` first to create one."

### Step 2: Gather All Documents

Read every document in the feature's specification directory. Use Glob to discover files
and Read to load their contents.

**Required documents:**
- `.speckit/<feature-slug>/spec.md` -- core specification (required; abort if missing)
- `.speckit/<feature-slug>/plan.md` -- implementation plan (optional)
- `.speckit/<feature-slug>/tasks.md` -- task list (optional)
- `.speckit/<feature-slug>/data-model.md` -- entity definitions (optional)

**Optional documents:**
- `.speckit/<feature-slug>/contracts/*.md` -- API contracts (zero or more)
- `.speckit/<feature-slug>/checklists/*.md` -- quality checklists (zero or more)

**Project-level documents:**
- `.speckit/constitution.md` -- project-level principles (optional)

For each document, note whether it was found or missing. Missing optional documents are
not errors but limit the scope of analysis. Record which documents were analyzed for the
report header.

### Step 3: Run Analysis Checks

Execute all eight analysis checks against the gathered documents. Reference the skill at
`skills/consistency-analysis/` for detailed rule definitions.

#### Check 1: Requirement Coverage

For each `FR-XXX` and `NFR-XXX` identifier found in `spec.md`:

1. Use Grep to search `tasks.md` for any reference to that requirement ID or its parent
   section `[Spec §X.Y]`.
2. If no matching task exists, record a finding:
   - CRITICAL if the requirement is P1 priority
   - HIGH if the requirement is P2 priority
   - MEDIUM if the requirement is P3 priority or no priority is stated
3. If `tasks.md` does not exist, record a single CRITICAL finding:
   "No tasks.md found -- requirement coverage cannot be verified."

#### Check 2: Task Traceability

For each task line in `tasks.md` that contains a `[Spec §X.Y]` reference:

1. Parse the section reference (e.g., `§3.1` maps to section 3, subsection 1).
2. Read the corresponding section in `spec.md`.
3. If the section does not exist, record a MEDIUM finding:
   "T{ID} references [Spec §X.Y] but that section does not exist in spec.md."
4. If the section exists but contains no relevant requirement, record a LOW finding:
   "T{ID} references [Spec §X.Y] but the section content does not clearly relate to the task."

#### Check 3: Plan Alignment

If `plan.md` exists, compare its architectural decisions against `tasks.md`:

1. Extract directory structure patterns from `plan.md` (e.g., `src/repositories/`).
2. Extract design patterns mentioned (e.g., "repository pattern", "middleware chain").
3. For each pattern or path, search `tasks.md` for tasks that create or modify files
   in the expected locations.
4. If a plan element has no corresponding task, record a HIGH finding:
   "plan.md specifies '{element}' but no task in tasks.md implements it."
5. If `plan.md` does not exist, skip this check silently.

#### Check 4: Data Model Consistency

If `data-model.md` exists:

1. Extract all entity names from `data-model.md`.
2. For each entity, search `tasks.md` for a task that creates the corresponding model file.
3. Check that entity attributes mentioned in `data-model.md` are consistent with those
   referenced in `spec.md` and `contracts/*.md`.
4. If an entity has no creation task, record a MEDIUM finding:
   "Entity '{name}' defined in data-model.md has no creation task in tasks.md."
5. If `data-model.md` does not exist, skip this check silently.

#### Check 5: Contract Coverage

If any `contracts/*.md` files exist:

1. Extract all API endpoints (method + path) from each contract file.
2. For each endpoint, search `tasks.md` for a task that implements that endpoint.
3. Also check that request/response schemas reference entities defined in `data-model.md`.
4. If an endpoint has no implementation task, record a HIGH finding:
   "Endpoint '{METHOD} {path}' defined in contracts/{file} has no implementation task."
5. If no contract files exist, skip this check silently.

#### Check 6: Constitution Compliance

If `.speckit/constitution.md` exists:

1. Read the constitution and extract key principles, constraints, and quality thresholds.
2. For each principle, check whether `plan.md` and `tasks.md` comply:
   - If the constitution mandates test coverage thresholds, count test-related tasks.
   - If it mandates specific patterns, check plan alignment.
   - If it mandates technology constraints, check spec and plan references.
3. Record findings at the appropriate severity:
   - CRITICAL if a core principle is violated by the plan architecture
   - HIGH if a quality threshold is unlikely to be met based on task composition
   - MEDIUM if a soft guideline is not reflected
4. If no constitution exists, skip this check silently.

#### Check 7: Duplication Detection

Scan `spec.md` for semantically overlapping requirements:

1. Compare each pair of FR-XXX descriptions for similar intent.
2. Compare FR requirements against NFR requirements for overlap
   (e.g., "hash passwords with bcrypt" in FR vs. "passwords must be encrypted" in NFR).
3. Look for identical or near-identical acceptance criteria across different requirements.
4. Record LOW findings for each detected duplication:
   "FR-{X} and {NFR/FR}-{Y} appear to overlap -- consider consolidating."

#### Check 8: Ambiguity Detection

Scan all requirement text in `spec.md` for vague or unmeasurable language:

1. Search for these ambiguous terms: "should", "might", "could", "may", "ideally",
   "approximately", "etc.", "as needed", "as appropriate", "reasonable", "adequate",
   "user-friendly", "fast", "efficient", "scalable".
2. For each match, record a finding with the specific location:
   - HIGH if the ambiguous term appears in a P1 requirement
   - MEDIUM if it appears in a P2/P3 requirement
   - LOW if it appears in assumptions or open questions sections

### Step 4: Classify and Aggregate Findings

After all checks complete:

1. Assign each finding a unique ID based on its check category:
   - RC-001, RC-002, ... (Requirement Coverage)
   - TT-001, TT-002, ... (Task Traceability)
   - PA-001, PA-002, ... (Plan Alignment)
   - DM-001, DM-002, ... (Data Model Consistency)
   - CC-001, CC-002, ... (Contract Coverage)
   - CP-001, CP-002, ... (Constitution Compliance)
   - DD-001, DD-002, ... (Duplication Detection)
   - AM-001, AM-002, ... (Ambiguity Detection)
2. Count findings by severity: CRITICAL, HIGH, MEDIUM, LOW.
3. Sort findings within each severity group by check category.

### Step 5: Generate Report

Output the analysis report directly to the terminal (do NOT write it to a file).

```
## Consistency Analysis Report

**Feature:** <feature-slug>
**Date:** <current date>
**Documents Analyzed:** <comma-separated list of files found and read>

---

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | X     |
| HIGH     | Y     |
| MEDIUM   | Z     |
| LOW      | W     |
| **Total**| **N** |

---

### Findings

#### CRITICAL
- **[RC-001]** FR-003 "rate limiting on login" has no corresponding task in tasks.md
  *Category: Requirement Coverage | Location: spec.md §3.3*

#### HIGH
- **[PA-001]** plan.md specifies "src/repositories/" pattern but no task creates files
  in that directory
  *Category: Plan Alignment | Location: plan.md §Architecture*

#### MEDIUM
...

#### LOW
...

---

### Recommendations

1. <Actionable recommendation for each CRITICAL finding>
2. <Actionable recommendation for each HIGH finding>
3. <General recommendation for MEDIUM/LOW findings>
```

### Step 6: Suggest Next Steps

Based on the findings, suggest the most appropriate next command:

- If CRITICAL or HIGH findings exist:
  > "Run `/speckit-helper:refine <feature-slug>` to address critical and high-severity
  > findings before proceeding to implementation."

- If only MEDIUM or LOW findings exist:
  > "Specification is in good shape. Consider running `/speckit-helper:implement <feature-slug>`
  > to begin implementation, or address medium/low findings with `/speckit-helper:refine`."

- If zero findings:
  > "Specification is fully consistent across all documents. Ready for implementation
  > with `/speckit-helper:implement <feature-slug>`."

---

## Error Handling

### spec.md Not Found

If `.speckit/<feature-slug>/spec.md` does not exist:
- Print: "Cannot analyze: spec.md not found at `.speckit/<feature-slug>/spec.md`.
  Run `/speckit-helper:specify` first."
- Abort the analysis. Do not attempt partial analysis without the core spec.

### Feature Directory Not Found

If `.speckit/<feature-slug>/` does not exist:
- Print: "Feature directory `.speckit/<feature-slug>/` not found. Available features: [list]"
- If no features exist at all: "No specifications found. Run `/speckit-helper:specify` first."

### Empty Documents

If a document exists but is empty or contains only whitespace:
- Record a HIGH finding: "{document} exists but is empty -- cannot analyze."
- Continue with remaining documents.

---

## Notes

- This command is intentionally read-only. It inspects and reports but never changes files.
- The analysis depth is limited by which documents exist. A minimal analysis (spec.md only)
  can still produce useful ambiguity and completeness findings.
- For best results, run this command after `/speckit-helper:tasks` has generated a task list,
  so that requirement coverage and task traceability checks can execute fully.
- Findings are printed to the terminal, not saved to a file. If the user wants to persist
  the report, they should redirect output or copy it manually.
- Re-run this command after `/speckit-helper:refine` to verify that findings were resolved.
