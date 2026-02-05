---
description: Execute implementation from task list with dependency-aware ordering
argument-hint: "[feature-slug] [--task T001] [--phase setup|foundation|stories|finalization]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, WebSearch, WebFetch
---

# /speckit-helper:implement

Execute implementation tasks from the task list in dependency-aware order, guided by the
specification and plan. Each task is implemented according to its spec reference, tested
where possible, and marked complete in `tasks.md`.

---

## Overview

This command is the execution engine of the speckit workflow. It reads the structured task
list, resolves dependencies, implements each task by creating or modifying code files, runs
tests when a test framework is available, and tracks progress by updating `tasks.md`. It
can operate on a single task, an entire phase, or automatically pick the next available
tasks in dependency order.

---

## Workflow

### Step 1: Resolve Feature Slug

Determine the feature-slug from `$ARGUMENTS`.

- The first positional argument is the feature-slug.
- If `$ARGUMENTS` is empty, use Glob to list directories under `.speckit/`:
  - If exactly one feature directory exists, use it automatically.
  - If multiple exist, list them and ask the user to choose.
  - If none exist, stop: "No specifications found. Run `/speckit-helper:specify` first."

### Step 2: Parse Optional Arguments

Extract targeting flags from `$ARGUMENTS`:

- `--task T001` — execute a single specific task by its ID.
- `--phase <name>` — execute all uncompleted tasks in the named phase.
  Valid phase names: `setup`, `foundation`, `stories`, `finalization`.
  Phase names are matched case-insensitively against phase headers in `tasks.md`.
- If neither `--task` nor `--phase` is provided, operate in **auto mode**: pick the next
  uncompleted task(s) in dependency order.

### Step 3: Quality Gate Check

Before executing any tasks, check for quality gate status:

1. Use Glob to look for `.speckit/<feature-slug>/checklists/*.md` files.
2. If checklist files exist, read each one and count unchecked items (`- [ ]`).
3. If unchecked items are found, print a warning:
   ```
   Quality gate warning: X unchecked items across Y checklists.
   Consider running /speckit-helper:checklist <feature-slug> to review.
   Proceeding with implementation...
   ```
4. This is a **warning only** -- it does NOT block implementation. The user may have
   intentionally deferred certain checklist items.
5. If no checklist files exist, skip this check silently.

### Step 4: Load Task List and Specification

Read the required documents:

1. **tasks.md** — Read `.speckit/<feature-slug>/tasks.md`.
   - If not found, stop: "Cannot implement: tasks.md not found. Run `/speckit-helper:tasks`
     to generate a task list from the specification."
2. **spec.md** — Read `.speckit/<feature-slug>/spec.md`.
   - If not found, stop: "Cannot implement: spec.md not found. Run `/speckit-helper:specify`
     first."
3. **plan.md** — Read `.speckit/<feature-slug>/plan.md` (optional).
   - If found, use it for architectural context during implementation.
   - If not found, proceed without plan guidance.
4. **data-model.md** — Read `.speckit/<feature-slug>/data-model.md` (optional).
   - If found, use entity definitions when creating model files.
5. **contracts/*.md** — Read all contract files (optional).
   - If found, use endpoint definitions when creating API handlers.

### Step 5: Identify Target Tasks

Parse `tasks.md` to build the full task list with dependency information.

**Task line format:**
```
- [ ] T001 [P] [US1] path/to/file.ext — Description (S) [Spec §2.1]
```

**Determine which tasks to execute:**

- **Single task mode** (`--task T001`):
  1. Find the task matching the given ID.
  2. If not found, stop: "Task T001 not found in tasks.md."
  3. If already completed (`[X]`), inform the user and stop:
     "Task T001 is already completed."
  4. Check if all prerequisite tasks (earlier tasks in the same phase that are not
     marked `[P]`) are completed. If not, warn but proceed:
     "Warning: T001 has uncompleted prerequisites: T002, T003."

- **Phase mode** (`--phase setup`):
  1. Find the phase section header matching the given name (case-insensitive match
     against phase headers like "## Phase 1: Setup").
  2. If no matching phase found, stop: "Phase '<name>' not found in tasks.md.
     Available phases: [list phase headers]."
  3. Collect all uncompleted tasks (`- [ ]`) in that phase.
  4. If all tasks in the phase are completed, inform: "All tasks in phase '<name>'
     are already completed."

- **Auto mode** (no flags):
  1. Scan tasks.md from top to bottom.
  2. Find the first phase with uncompleted tasks.
  3. Within that phase, select:
     - All `[P]` (parallelizable) uncompleted tasks, OR
     - The next sequential uncompleted task if no `[P]` tasks remain.
  4. Print: "Auto-selected N task(s) from Phase X: <phase name>"

### Step 6: Execute Each Task

For each target task, in order:

#### 6a: Read Context

1. Parse the task's `[Spec §X.Y]` reference.
2. Read the relevant section(s) from `spec.md` to understand the requirement.
3. If `plan.md` exists, read the relevant architectural guidance.
4. If the task references an entity, read `data-model.md` for field definitions.
5. If the task involves an API endpoint, read the relevant `contracts/*.md` file.

#### 6b: Implement the Change

Based on the task description and spec context:

1. **If the target file does not exist:** Create it with the appropriate content.
   - Use the project's detected tech stack to choose the right language, import style,
     and conventions.
   - If `plan.md` specifies a directory structure, follow it.
   - Include appropriate file headers, imports, and boilerplate.

2. **If the target file already exists:** Read it first, then modify it.
   - Use Edit to make targeted changes rather than rewriting the entire file.
   - Preserve existing code that is not related to the current task.
   - Follow the existing code style (indentation, naming conventions, etc.).

3. **For complex tasks (L):** Break the implementation into logical steps:
   - Create or update the primary file.
   - Create or update any supporting files (types, interfaces, utilities).
   - Add necessary imports to existing files that depend on the new code.

4. **Respect existing project conventions:**
   - Check for existing linter config (`.eslintrc`, `.prettierrc`, `pyproject.toml`, etc.)
   - Follow naming patterns visible in existing files.
   - Match the existing module/export style.

#### 6c: Run Tests (If Available)

After implementing the task, attempt to run relevant tests:

1. **Detect the test framework** by checking for:
   - `jest.config.*`, `vitest.config.*` (JavaScript/TypeScript)
   - `pytest.ini`, `pyproject.toml [tool.pytest]`, `setup.cfg [tool:pytest]` (Python)
   - `*_test.go` files (Go)
   - `Cargo.toml [dev-dependencies]` (Rust)
   - `pom.xml <surefire>` or `build.gradle` (Java)

2. **If a test framework is detected:**
   - If the task created a test file, run that specific test.
   - If the task modified a source file, run tests related to that file (e.g., matching
     test file name pattern).
   - If no specific test file can be identified, run the full test suite only if it
     typically completes in under 60 seconds. Otherwise, skip with a note.

3. **If tests fail:**
   - Print the failure output.
   - Attempt to fix the issue (up to 2 retry attempts).
   - If the fix succeeds, continue.
   - If the fix fails after retries, report the failure but do NOT mark the task as
     complete. Print:
     "Task T{ID} implemented but tests are failing. Manual review needed."
   - Continue to the next task.

4. **If no test framework is detected:**
   - Skip testing with a note: "No test framework detected. Skipping test execution."

#### 6d: Mark Task Complete

If implementation succeeded (and tests passed or no tests exist):

1. Edit `tasks.md` to change the task's checkbox from `- [ ]` to `- [X]`:
   ```
   - [X] T001 [P] [US1] src/config/auth.ts — Configure authentication middleware (S) [Spec §2.1]
   ```
2. Print progress:
   ```
   Completed T001: Configure authentication middleware [Phase 1: Setup]
   ```

### Step 7: Post-Implementation Checks

After all target tasks have been processed:

1. **Directory hygiene:** If new directories were created during implementation:
   - Check if `.gitignore` exists at the project root.
   - If new directories contain generated files, build artifacts, or environment files,
     suggest adding them to `.gitignore`.
   - Do NOT automatically modify `.gitignore` without confirmation.

2. **Dependency check:** If new dependencies were added (e.g., new `import` statements
   referencing uninstalled packages):
   - Detect the package manager (`npm`, `yarn`, `pnpm`, `pip`, `cargo`, `go mod`).
   - Suggest running the appropriate install command.
   - Do NOT automatically install packages without confirmation.

### Step 8: Print Completion Summary

Print a structured summary of the implementation session:

```
--- Implementation Summary ---

Feature:    <feature-slug>
Mode:       <single-task | phase | auto>
Target:     <task ID or phase name>

Tasks completed: N
  T001 — Configure authentication middleware (S) [Setup]
  T002 — Add auth environment variables (S) [Setup]

Tasks failed: M
  T003 — Tests failing, manual review needed

Tasks remaining: R (across all phases)
  Phase 2: Foundation — 4 tasks
  Phase 3: Stories (P1) — 6 tasks
  Phase 4: Finalization — 3 tasks

Test results:
  Passed: X | Failed: Y | Skipped: Z

Suggested next step:
  /speckit-helper:implement <feature-slug> --phase foundation
```

---

## Error Handling

### tasks.md Not Found

If `.speckit/<feature-slug>/tasks.md` does not exist:
- Print: "Cannot implement: no task list found at `.speckit/<feature-slug>/tasks.md`.
  Run `/speckit-helper:tasks <feature-slug>` to generate tasks from the specification."
- Abort entirely.

### spec.md Not Found

If `.speckit/<feature-slug>/spec.md` does not exist:
- Print: "Cannot implement: spec.md not found. The specification is required for
  context during implementation. Run `/speckit-helper:specify` first."
- Abort entirely.

### Task ID Not Found

If `--task T999` references a task ID that does not exist in tasks.md:
- Print: "Task T999 not found in tasks.md. Available tasks: T001-T{max}."
- Abort without executing any tasks.

### Phase Not Found

If `--phase integration` does not match any phase header in tasks.md:
- Print: "Phase 'integration' not found. Available phases: [list phase names]."
- Abort without executing any tasks.

### Test Failures

If tests fail after implementation:
- Report the failure clearly with test output.
- Attempt automated fix (up to 2 retries).
- If still failing, leave the task as uncompleted in tasks.md.
- Continue to the next task (do not abort the entire session).
- Include the failure in the completion summary.

### File Write Conflicts

If a target file was modified outside the speckit workflow since the last task:
- Read the current file state before making changes.
- Use Edit for targeted modifications rather than full file replacement.
- If the file structure has changed significantly, warn the user and request guidance.

---

## Notes

- Implementation follows the dependency order encoded in `tasks.md`. Sequential tasks
  within a phase are executed in order. `[P]` tasks can be executed in any order.
- The command respects existing project conventions. It reads existing code to match
  style, naming, and structural patterns before generating new code.
- Each implementation session is idempotent for completed tasks: re-running the command
  will skip tasks already marked `[X]` and pick up where the previous session left off.
- For large features, it is recommended to implement one phase at a time using `--phase`
  and run `/speckit-helper:analyze` between phases to catch consistency issues early.
- The quality gate check in Step 3 is non-blocking by design. Teams that want strict
  enforcement should manually review checklists before running this command.
- If `WebSearch` or `WebFetch` are needed during implementation (e.g., to check library
  documentation or API references), they are available but should be used sparingly.
