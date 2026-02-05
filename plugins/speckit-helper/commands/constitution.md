---
description: Create or update project constitution defining principles and governance rules
allowed-tools: Read, Write, Edit, Glob, AskUserQuestion
---

# /speckit-helper:constitution

Create or update a project constitution defining principles and governance rules.

---

## Overview

A project constitution is a living document that establishes the non-negotiable
principles, architectural decisions, coding standards, and quality thresholds
that all specifications in the project must comply with. It acts as a governance
layer: when specs are analyzed or checklists are generated, they are checked
against the constitution for compliance.

---

## Workflow

### Step 1: Check for Existing Constitution

Use Glob to check whether `.speckit/constitution.md` already exists.

- If the file **does NOT exist**, proceed to **Step 2 (New Constitution)**.
- If the file **exists**, proceed to **Step 3 (Update Existing)**.

---

### Step 2: Create New Constitution

#### 2a. Explain the Purpose

Before gathering input, explain to the user what a constitution is and why it
matters:

> A project constitution defines the principles and rules that ALL specifications
> in this project must comply with. Think of it as your project's "bill of rights"
> -- the non-negotiable standards that every feature must respect.
>
> I'll ask you about four categories of principles. You can provide as many or
> as few as you like in each category. These can always be updated later.

#### 2b. Gather Principles via AskUserQuestion

Collect principles in four categories, using AskUserQuestion for each:

**Category 1: Core Principles**
Ask: "What are your non-negotiable architectural rules? These are principles that
must never be violated, regardless of the feature being built."

Examples to offer:
- "All data must be encrypted at rest and in transit"
- "No vendor lock-in: all integrations must use standard protocols"
- "Offline-first: all features must work without network connectivity"
- "Multi-tenancy: all data must be tenant-isolated"

**Category 2: Architecture Decisions**
Ask: "What key technology choices has the project committed to? Think of these as
ADR-style (Architecture Decision Records) entries."

Examples to offer:
- "Use PostgreSQL as the primary database"
- "All services communicate via gRPC"
- "Frontend uses React with TypeScript"
- "Event-driven architecture using Kafka for async processing"

**Category 3: Coding Standards**
Ask: "What project-specific coding conventions should all implementations follow?"

Examples to offer:
- "All public APIs must have OpenAPI documentation"
- "No function longer than 50 lines"
- "All database queries must use parameterized statements"
- "Error messages must be user-friendly and localizable"

**Category 4: Quality Thresholds**
Ask: "What are the minimum acceptable quality criteria for any feature in this
project?"

Examples to offer:
- "Minimum 80% test coverage for all new code"
- "All APIs must respond within 200ms at p95"
- "Zero critical accessibility violations (WCAG 2.1 AA)"
- "All features must include rollback capability"

#### 2c. Write the Constitution

Write `.speckit/constitution.md` with the following structure:

```markdown
# Project Constitution

**Version:** 1.0.0
**Created:** <DATE>
**Last Updated:** <DATE>

---

## Purpose

This constitution defines the non-negotiable principles, architectural decisions,
coding standards, and quality thresholds that all specifications and implementations
in this project must comply with.

---

## 1. Core Principles

<user-provided principles, each as a numbered item with brief explanation>

## 2. Architecture Decisions

<user-provided decisions in ADR-style format>
<Each entry: ID (AD-001+), title, context, decision, consequences>

## 3. Coding Standards

<user-provided standards, each as a numbered item>

## 4. Quality Thresholds

<user-provided thresholds, each with a measurable criterion>

---

## Compliance

Specifications are checked against this constitution during:
- `/speckit-helper:analyze` — gap analysis flags constitutional violations
- `/speckit-helper:checklist` — generated checklists include constitution items

---

## Changelog

| Date       | Version | Description          |
|------------|---------|----------------------|
| <DATE>     | 1.0.0   | Initial constitution |
```

If the user provides no input for a category, include the section header with
a placeholder:
> _No principles defined yet. Run `/speckit-helper:constitution` to add._

---

### Step 3: Update Existing Constitution

#### 3a. Read and Display Current Constitution

Read `.speckit/constitution.md` and display a concise summary to the user:

```
--- Current Constitution (v<VERSION>) ---

Core Principles:       <N> defined
Architecture Decisions: <N> defined
Coding Standards:      <N> defined
Quality Thresholds:    <N> defined

Last updated: <DATE>
```

List the key items in each category in a brief, scannable format.

#### 3b. Ask What to Change

Use **AskUserQuestion** to ask:

> "What would you like to change in the constitution? You can:
> 1. Add new principles to any category
> 2. Modify existing principles
> 3. Remove outdated principles
> 4. Update thresholds or standards
>
> Describe the changes you want to make."

#### 3c. Apply Modifications

Based on the user's response, modify `.speckit/constitution.md`:

- **Adding new items:** Append to the appropriate category section. For
  Architecture Decisions, assign the next sequential AD-ID.
- **Modifying items:** Use the Edit tool to update the specific item in place.
- **Removing items:** Remove the item and add a note in the changelog about
  what was removed and why.

Use the Edit tool for all modifications to preserve unchanged content.

#### 3d. Increment Version

Apply semantic versioning to the constitution:

- **Minor version bump** (e.g., 1.0.0 -> 1.1.0) for:
  - Adding new principles, decisions, standards, or thresholds
  - Adding new categories or sections
- **Patch version bump** (e.g., 1.1.0 -> 1.1.1) for:
  - Wording clarifications to existing items
  - Fixing typos or formatting
  - Minor threshold adjustments

Update the `Version` and `Last Updated` fields in the document header.

#### 3e. Add Changelog Entry

Append a new row to the Changelog table:

| Date       | Version | Description                        |
|------------|---------|-------------------------------------|
| <DATE>     | <VER>   | <brief description of what changed> |

---

### Step 4: Print Summary

After creating or updating the constitution, print a summary:

**For new constitutions:**
```
--- Constitution Created ---

File:     .speckit/constitution.md
Version:  1.0.0

Principles defined:
  Core Principles:        <N>
  Architecture Decisions: <N>
  Coding Standards:       <N>
  Quality Thresholds:     <N>

Note: /speckit-helper:analyze and /speckit-helper:checklist will check
specifications for compliance with this constitution.
```

**For updated constitutions:**
```
--- Constitution Updated ---

File:     .speckit/constitution.md
Version:  <old> -> <new>

Changes:
  - <summary of changes made>

Note: Existing specifications have NOT been re-checked against the updated
constitution. Run /speckit-helper:analyze <feature-slug> to verify compliance.
```

---

## Notes

- The constitution is a project-level document, not feature-specific. It lives
  at `.speckit/constitution.md`, not inside a feature directory.
- `/speckit-helper:analyze` and `/speckit-helper:checklist` will check
  specifications for compliance with the constitution when it exists.
- The constitution should be kept concise and actionable. Principles that are
  too vague to verify should be sharpened or moved to a guidance document.
- Version 1.0.0 is always the first version. Pre-1.0 versions are not used
  for constitutions (unlike specs which start at v0.1.0).
- If a constitution change invalidates existing specs, the summary should note
  which specs may need review.
