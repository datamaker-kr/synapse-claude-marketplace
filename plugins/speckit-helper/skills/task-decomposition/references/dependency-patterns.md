# Dependency Patterns

Common patterns for ordering tasks in a feature implementation.

## Sequential Dependencies

Tasks that must execute in order because each builds on the previous output.

```
Data Model → Repository/Service → API Endpoint → Frontend Component → E2E Test
```

**Example:**
```
T003 src/models/user.ts — Create User model
T005 src/services/auth.ts — Implement auth service (depends on T003)
T008 src/routes/auth.ts — Create login endpoint (depends on T005)
T010 src/components/LoginForm.tsx — Build login form (depends on T008)
```

## Parallel Tasks

Tasks with no shared dependencies that can be worked on simultaneously. Mark with `[P]`.

**Conditions for parallelism:**
- Different files with no import relationship
- Independent user stories
- Config/setup tasks that don't depend on each other

**Example:**
```
T001 [P] src/config/database.ts — Configure database connection
T002 [P] src/config/auth.ts — Configure auth middleware
T003 [P] .env.example — Add environment variable template
```

## Foundation-First Pattern

Establish shared infrastructure before feature-specific work.

```
Phase 1 (Setup):     Config, environment, dependencies
Phase 2 (Foundation): Database schema, core models, shared services
Phase 3+ (Features):  User story implementations
Phase N (Finalize):   Documentation, cleanup, deployment
```

**Foundation items are always blocking** — no feature task should start until Phase 2 is complete.

## Cross-Cutting Concerns

Tasks that touch multiple features and belong in the finalization phase:

- Error handling standardization
- Logging and monitoring
- Documentation generation
- Security hardening
- Performance optimization
- CI/CD configuration

These should reference multiple user stories: `[US1, US2, US3]`.

## Checkpoint Gates

Between phases, insert a verification step:

```markdown
### Checkpoint: Phase 2 Complete
- [ ] All foundation models pass unit tests
- [ ] Database migrations run successfully
- [ ] Core services have basic integration tests
```

No Phase 3 task should be started until the checkpoint passes.

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Circular dependencies | T005 depends on T008 which depends on T005 | Break the cycle with an interface/contract |
| Implicit dependencies | T008 uses User model but doesn't list T003 as dependency | Make all dependencies explicit in task notes |
| Everything sequential | All tasks in a single chain | Identify parallel opportunities with `[P]` |
| No checkpoints | Rush from setup to stories | Add checkpoint gates between phases |
