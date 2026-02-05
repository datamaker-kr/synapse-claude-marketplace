# Severity Level Definitions

## CRITICAL

**Impact:** Blocks implementation or causes fundamental design failure.
**Action:** Must be resolved before proceeding to any implementation.

**Examples:**
- Requirement in spec.md with no task and no plan coverage
- Contradictory requirements (FR-001 says X, FR-005 says not-X)
- Constitution principle violated by plan architecture
- Missing data model for a core entity referenced in multiple tasks

---

## HIGH

**Impact:** Significant gap that will cause rework if not addressed.
**Action:** Should be resolved before starting the affected phase.

**Examples:**
- Partial requirement coverage (task exists but doesn't cover all acceptance criteria)
- Ambiguous requirement that affects design decisions
- Plan specifies a pattern but tasks don't follow it
- API contract endpoint without implementation task
- Missing edge case handling for P1 user story

---

## MEDIUM

**Impact:** Minor inconsistency that may cause confusion but won't block delivery.
**Action:** Should be resolved before finalization phase.

**Examples:**
- Task references a spec section that exists but is loosely related
- Entity attribute in data-model.md not referenced in any task
- Slight naming inconsistency between documents
- Non-functional requirement without a specific measurement target
- Duplicate requirement across different sections

---

## LOW

**Impact:** Documentation quality issue with no functional impact.
**Action:** Address during finalization or as time permits.

**Examples:**
- Missing cross-reference link between documents
- Style inconsistency (some requirements use "must", others use "shall")
- Orphaned section headers with no content
- Spec changelog not updated after refinement
- Unused open question that was resolved elsewhere

---

## Severity Decision Matrix

| Condition | Severity |
|-----------|----------|
| Requirement exists in spec but has zero tasks | CRITICAL |
| Requirement contradicts another requirement | CRITICAL |
| Constitution principle violated | CRITICAL |
| Task exists but misses acceptance criteria | HIGH |
| API endpoint without implementation task | HIGH |
| Ambiguous language in P1 requirement | HIGH |
| Ambiguous language in P2/P3 requirement | MEDIUM |
| Entity defined but not fully used in tasks | MEDIUM |
| Naming inconsistency across documents | LOW |
| Missing cross-reference | LOW |
