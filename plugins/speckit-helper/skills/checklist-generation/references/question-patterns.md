# Dynamic Question Generation Patterns

Checklist questions are generated dynamically based on the content of `spec.md`. Each pattern type produces questions by analyzing specific elements in the specification.

## Pattern Types

### 1. Requirement-Based Questions

For each `FR-XXX` or `NFR-XXX` in spec.md:

```
- [ ] Is FR-XXX measurable and independently testable? [Spec §3]
- [ ] Does FR-XXX have at least one acceptance criterion? [Spec §3]
- [ ] Can FR-XXX be verified without external dependencies? [Spec §3]
```

### 2. User Story Questions

For each `US[N]` in spec.md:

```
- [ ] Are all edge cases listed for US[N]? [Spec §2]
- [ ] Does US[N] have both happy-path and error-path acceptance criteria? [Spec §2]
- [ ] Can US[N] be implemented and tested independently? [Spec §2]
- [ ] Is the priority (P1/P2/P3) justified for US[N]? [Spec §2]
```

### 3. Entity-Based Questions

For each entity in spec.md section 5 (Key Entities):

```
- [ ] Is the [Entity] lifecycle fully specified (create, read, update, delete)? [Spec §5]
- [ ] Are all [Entity] attributes defined with types and constraints? [Spec §5]
- [ ] Are relationships between [Entity] and other entities documented? [Spec §5]
- [ ] Is [Entity] validation defined for required fields? [Spec §5]
```

### 4. API Endpoint Questions

For each endpoint referenced in spec.md or contracts/:

```
- [ ] Are error responses documented for [endpoint]? [Spec §3]
- [ ] Is authentication required for [endpoint]? If so, is it specified? [Spec §4]
- [ ] Are request payload size limits defined for [endpoint]? [Spec §4]
- [ ] Is the response format (JSON, etc.) specified for [endpoint]? [Spec §3]
```

### 5. Success Criteria Questions

For each `SC-XXX` in spec.md:

```
- [ ] Is SC-XXX measurable with a specific numeric target? [Spec §6]
- [ ] Is the measurement method for SC-XXX defined? [Spec §6]
- [ ] Can SC-XXX be verified in an automated test? [Spec §6]
```

### 6. Domain-Specific Overlays

After generating base questions, overlay domain-specific questions:

**Security overlay:** For each FR that handles user input:
```
- [ ] Is input validation specified for FR-XXX? [Spec §3]
- [ ] Is output encoding specified to prevent XSS for FR-XXX? [Spec §3]
```

**Performance overlay:** For each FR that queries data:
```
- [ ] Is a response time target defined for FR-XXX? [Spec §4]
- [ ] Is the expected data volume specified for FR-XXX? [Spec §4]
```

## Output Format

Each generated checklist follows this structure:

```markdown
# [Domain] Checklist — [Feature Name]

**Generated:** [DATE]
**Spec:** .speckit/[feature-slug]/spec.md
**Domain:** [ux|api|security|performance|data]

## Requirement Completeness
- [ ] Question about FR-001 [Spec §3]
- [ ] Question about FR-002 [Spec §3]

## User Story Coverage
- [ ] Question about US1 [Spec §2]
- [ ] Question about US2 [Spec §2]

## [Domain-Specific Section]
- [ ] Domain-specific question [Spec §X]
```

## Relevance Filtering

Not all patterns apply to every feature. Skip patterns when:
- No entities defined → skip entity-based questions
- No API endpoints → skip endpoint questions
- CLI-only feature → skip UX questions about responsive design
- Read-only feature → skip data mutation questions
