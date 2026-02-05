# Task Format Reference

## Task Line Format

Each task in `tasks.md` follows this format:

```
- [ ] T001 [P] [US1] path/to/file.ext — Description (S) [Spec §2.1]
```

### Components

| Component | Required | Description | Example |
|-----------|----------|-------------|---------|
| `- [ ]` | Yes | Checkbox (uncompleted) | `- [ ]` or `- [X]` |
| `T001` | Yes | Sequential task ID (T001-T999) | `T001`, `T042` |
| `[P]` | No | Parallelizable marker — task has no blocking dependencies | `[P]` |
| `[US1]` | Yes | User story reference from spec.md | `[US1]`, `[US3]` |
| `path/to/file.ext` | Yes | Target file path (relative to project root) | `src/models/user.ts` |
| `—` | Yes | Separator (em dash) | `—` |
| Description | Yes | What this task does (imperative form) | `Create User model` |
| `(S)` | Yes | Complexity: (S)mall, (M)edium, (L)arge | `(S)`, `(M)`, `(L)` |
| `[Spec §X.Y]` | Yes | Traceability to spec section | `[Spec §3.1]` |

### Complexity Guidelines

| Size | Scope | Typical Changes |
|------|-------|-----------------|
| **(S)** Small | Single file, < 50 lines of change | Config, simple model, test fixture |
| **(M)** Medium | 1-3 files, 50-200 lines | Service function, API endpoint, component |
| **(L)** Large | 3+ files, 200+ lines | Integration, complex business logic, migrations |

### Completion States

```
- [ ] T001 ...          # Pending
- [X] T001 ...          # Completed
- [X] T001 (#42) ...    # Completed with GitHub Issue link
- [ ] T001 [Gap] ...    # Task derived from gap analysis (no spec reference)
```

### Examples

```markdown
## Phase 1: Setup
- [ ] T001 [P] [US1] src/config/auth.ts — Configure authentication middleware (S) [Spec §2.1]
- [ ] T002 [P] [US1] .env.example — Add auth environment variables (S) [Spec §2.1]

## Phase 2: Foundation
- [ ] T003 [US1] src/models/user.ts — Create User model with password hash field (M) [Spec §3.1]
- [ ] T004 [US1] src/models/session.ts — Create Session model with expiry (S) [Spec §3.1]

## Phase 3: User Stories (P1)
- [ ] T005 [US1] src/services/auth.ts — Implement registration with email validation (M) [Spec §2.2]
- [ ] T006 [US2] src/services/auth.ts — Implement login with rate limiting (M) [Spec §2.3]
- [ ] T007 [US2] src/middleware/rate-limit.ts — Add brute-force protection middleware (S) [Spec §4.1]

## Phase 4: Finalization
- [ ] T012 [US1] docs/api/auth.md — Document authentication API endpoints (S) [Spec §2.1]
```
