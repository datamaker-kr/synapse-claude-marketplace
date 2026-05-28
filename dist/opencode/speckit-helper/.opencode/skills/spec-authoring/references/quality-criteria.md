# Specification Quality Criteria

Use these criteria to evaluate whether a specification is ready for planning and implementation.

## The Five Qualities of a Good Specification

### 1. Testable

Every requirement has measurable acceptance criteria that can be independently verified.

- **Good:** "The login endpoint must return a 200 response within 500ms for 95% of requests"
- **Bad:** "The login should be fast"

Each user story includes Given/When/Then acceptance criteria with concrete values.

### 2. Unambiguous

Requirements use precise language with no room for interpretation.

- **Use:** "must", "shall", "will"
- **Avoid:** "should", "might", "could", "can", "may", "ideally", "optionally"
- **Avoid:** "etc.", "and so on", "similar to", "as appropriate"

If a requirement contains ambiguous language, mark it with `[Clarification needed]`.

### 3. Complete

All aspects of each user story are covered:

- Happy path (normal flow)
- Edge cases (boundary conditions, empty states, maximum values)
- Error scenarios (invalid input, network failure, permission denied)
- State transitions (what changes after the action)

No requirement references undefined terms or external specs without links.

### 4. Traceable

Every requirement has a unique identifier:

- `FR-001` for functional requirements
- `NFR-001` for non-functional requirements
- `SC-001` for success criteria
- `US1`, `US2` for user story references

Tasks and checklists can reference these IDs via `[Spec §X.Y]` notation.

### 5. Independent

Each user story can be:

- Understood without reading other stories
- Implemented in isolation (with appropriate stubs)
- Tested independently
- Delivered separately (incremental value)

Stories that depend on each other should document the dependency explicitly.

## Quality Checklist

Before proceeding to `/speckit-helper:plan`, verify:

- [ ] All requirements use "must" or "shall"
- [ ] Every user story has at least 2 acceptance criteria
- [ ] Every user story lists at least 1 edge case
- [ ] No `[Clarification needed]` markers remain
- [ ] All Open Questions are resolved `[X]`
- [ ] Success criteria are measurable with concrete numbers
- [ ] Key entities are defined if the feature involves data
