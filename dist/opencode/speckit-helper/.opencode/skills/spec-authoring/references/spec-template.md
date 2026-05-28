# Feature Specification Template

> Use this template when generating `spec.md` for a new feature.
> Replace all placeholders (`[...]`) with actual content.
> Follow the user's conversation language for all sections.

---

## [Feature Name]

**Date:** [DATE]
**Status:** Draft
**Input:** [User's original feature description]

---

## 1. Feature Overview

[1-2 paragraph summary of what this feature does, why it's needed, and who benefits from it.]

---

## 2. User Stories & Acceptance Criteria

### US1: [Story Title] (P1)

**As a** [role],
**I want** [capability],
**So that** [benefit].

**Priority Rationale:** [Why this is P1/P2/P3]

**Acceptance Criteria:**

- **Given** [initial state], **When** [action], **Then** [expected result]
- **Given** [initial state], **When** [action], **Then** [expected result]

**Edge Cases:**
- [Edge case 1 and expected behavior]
- [Edge case 2 and expected behavior]

### US2: [Story Title] (P2)

**As a** [role],
**I want** [capability],
**So that** [benefit].

**Priority Rationale:** [Why this is P1/P2/P3]

**Acceptance Criteria:**

- **Given** [initial state], **When** [action], **Then** [expected result]

**Edge Cases:**
- [Edge case and expected behavior]

### US3: [Story Title] (P3)

[Same format as above. Add more stories as needed.]

---

## 3. Functional Requirements

| ID | Requirement | User Story | Notes |
|----|------------|------------|-------|
| FR-001 | [The system must...] | US1 | |
| FR-002 | [The system must...] | US1 | |
| FR-003 | [The system must...] | US2 | |
| FR-004 | [The system must...] | US2 | [Clarification needed] |
| FR-005 | [The system must...] | US3 | |

> Use "must" or "shall" — avoid "should", "might", "could".
> Mark unclear requirements with `[Clarification needed]`.

---

## 4. Non-Functional Requirements

| ID | Requirement | Category | Notes |
|----|------------|----------|-------|
| NFR-001 | [Performance: The system must respond within X ms] | Performance | |
| NFR-002 | [Security: The system must encrypt...] | Security | |
| NFR-003 | [Accessibility: The system must support...] | Accessibility | |

---

## 5. Key Entities

> Include this section if the feature involves data models or domain objects.

| Entity | Description | Key Attributes |
|--------|------------|----------------|
| [Entity1] | [What it represents] | [attr1, attr2, attr3] |
| [Entity2] | [What it represents] | [attr1, attr2] |

---

## 6. Success Criteria

| ID | Criteria | Measurement |
|----|---------|-------------|
| SC-001 | [Measurable outcome] | [How to measure] |
| SC-002 | [Measurable outcome] | [How to measure] |
| SC-003 | [Measurable outcome] | [How to measure] |

---

## 7. Assumptions & Constraints

### Assumptions
- [Assumption 1]
- [Assumption 2]

### Constraints
- [Constraint 1]
- [Constraint 2]

---

## 8. Open Questions

- [ ] [Question 1 that needs clarification]
- [ ] [Question 2 that needs clarification]
- [X] [Resolved question — answer: ...]

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| [DATE] | Initial specification created | AI-assisted |
