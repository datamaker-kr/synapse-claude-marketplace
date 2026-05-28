# Phase Ordering Rules

Tasks are organized into phases that execute sequentially. Within each phase, tasks marked `[P]` can run in parallel.

## Phase Structure

### Phase 1: Setup

**Purpose:** Initialize project infrastructure. No business logic.

**Typical tasks:**
- Project configuration files
- Dependency installation
- Environment variable templates
- Build/test tooling setup
- Directory structure creation

**Characteristics:**
- All tasks are parallelizable `[P]`
- No dependencies on existing business code
- Fastest phase — mostly boilerplate

**Exit gate:** Project builds and tests run (even if no tests exist yet).

---

### Phase 2: Foundation

**Purpose:** Establish shared models, services, and middleware that multiple user stories depend on.

**Typical tasks:**
- Database schema / data models
- Core service interfaces
- Authentication/authorization middleware
- Shared utility functions
- Base API route configuration

**Characteristics:**
- Some tasks are sequential (model before service)
- This phase is **blocking** — no story work starts until foundation is stable
- Most critical phase for quality — errors here cascade everywhere

**Exit gate:** All models have unit tests. Core services have basic integration tests. Database migrations run cleanly.

---

### Phase 3+: User Stories

**Purpose:** Implement features grouped by user story priority.

**Organization:**
```
Phase 3: P1 User Stories (highest priority)
Phase 4: P2 User Stories
Phase 5: P3 User Stories
```

Each user story group contains:
1. Service/business logic implementation
2. API endpoints or UI components
3. Unit tests for the story
4. Integration tests (if applicable)

**Characteristics:**
- Stories within the same priority CAN be parallel if independent
- Stories across priorities are sequential (P1 before P2)
- Each story must be independently testable
- Story-level checkpoint after each group

**Within a story, typical order:**
```
Service logic → API endpoint → Frontend component → Tests
```

**Exit gate per story:** All acceptance criteria from spec.md pass.

---

### Phase N-1: Integration

**Purpose:** Validate cross-story interactions and end-to-end flows.

**Typical tasks:**
- End-to-end test scenarios
- Cross-story data flow validation
- Performance testing
- Security testing
- Error handling standardization across features

**Characteristics:**
- Requires all stories to be complete
- May uncover integration issues that need fixes
- Tasks reference multiple user stories

**Exit gate:** E2E tests pass. No critical or high severity issues from `/speckit-helper:analyze`.

---

### Phase N: Finalization

**Purpose:** Polish, document, and prepare for delivery.

**Typical tasks:**
- API documentation
- User-facing documentation
- Code cleanup and linting
- Deployment configuration
- .gitignore / .dockerignore updates
- README updates
- Migration guide (if applicable)

**Characteristics:**
- All tasks are parallelizable `[P]`
- No new business logic
- Cross-cutting concerns only

**Exit gate:** All checklists from `/speckit-helper:checklist` pass. Documentation is complete.

---

## Phase Numbering Convention

| Phase | Name | Content |
|-------|------|---------|
| 1 | Setup | Infrastructure, config, deps |
| 2 | Foundation | Models, core services, middleware |
| 3 | Stories (P1) | Highest priority user stories |
| 4 | Stories (P2) | Medium priority user stories |
| 5 | Stories (P3) | Lower priority user stories |
| N-1 | Integration | E2E tests, cross-story validation |
| N | Finalization | Docs, cleanup, deployment prep |

If a feature has only P1 stories, the structure simplifies to:
```
Phase 1: Setup → Phase 2: Foundation → Phase 3: Stories → Phase 4: Finalization
```
