# Checklist Domains

Each domain generates a checklist that tests specification completeness from a specific perspective. These are **requirement tests**, not implementation tests.

## Available Domains

### `ux` — User Experience & Accessibility

Tests whether the spec adequately covers the user-facing experience.

**Question areas:**
- Are all user-facing states defined? (loading, empty, error, success)
- Is responsive behavior specified for each UI component?
- Are keyboard navigation requirements included?
- Is screen reader support specified?
- Are color contrast requirements defined (WCAG AA/AAA)?
- Are internationalization (i18n) requirements stated?
- Is offline behavior specified?
- Are animation/transition durations defined?
- Are form validation messages specified for each field?
- Is the user flow documented for each story (happy path + error path)?

---

### `api` — API Design & Contracts

Tests whether API specifications are complete and consistent.

**Question areas:**
- Does every endpoint have request and response schemas?
- Are all HTTP methods and status codes specified?
- Are error response formats consistent?
- Is pagination specified for list endpoints?
- Is API versioning strategy defined?
- Are rate limiting rules specified per endpoint?
- Are authentication requirements stated for each endpoint?
- Are query parameter formats and validation rules defined?
- Are file upload size limits specified?
- Is the API backward-compatibility strategy defined?

---

### `security` — Security Considerations

Tests whether security aspects are adequately addressed in the spec.

**Question areas:**
- Are authentication mechanisms fully specified?
- Is authorization (role-based access) defined for each operation?
- Are password policies specified (length, complexity, hashing algorithm)?
- Is input validation defined for all user inputs?
- Are SQL injection / XSS / CSRF protections mentioned?
- Is sensitive data encryption specified (at rest and in transit)?
- Are session management rules defined (expiry, invalidation)?
- Is audit logging specified for sensitive operations?
- Are rate limiting / brute-force protections defined?
- Is data retention and deletion policy specified?

---

### `performance` — Performance & Scalability

Tests whether performance requirements are measurable and complete.

**Question areas:**
- Are response time targets defined per endpoint/operation?
- Are throughput requirements specified (requests per second)?
- Are concurrent user targets stated?
- Is database query optimization mentioned for data-heavy operations?
- Are caching strategies specified?
- Are file/payload size limits defined?
- Are background job processing requirements stated?
- Is CDN / static asset optimization mentioned?
- Are database indexing requirements specified?
- Are load testing criteria defined?

---

### `data` — Data Integrity & Migrations

Tests whether data management aspects are fully specified.

**Question areas:**
- Are all entity relationships defined (1:1, 1:N, N:M)?
- Are required vs. optional fields specified for each entity?
- Are unique constraints and indexes defined?
- Is data migration strategy specified (for existing data)?
- Are soft-delete vs. hard-delete policies defined?
- Is data backup and recovery strategy mentioned?
- Are data validation rules specified at the model level?
- Is GDPR / data privacy compliance addressed?
- Are audit trails specified for data modifications?
- Is data seeding / fixture strategy defined for testing?

---

## Using the `--domain` Flag

```bash
# Generate a single domain checklist
/speckit-helper:checklist my-feature --domain security

# Generate all applicable domain checklists
/speckit-helper:checklist my-feature --domain all
```

When `--domain all` is used, only generate checklists for domains that are relevant to the feature. For example, a CLI tool feature doesn't need a `ux` checklist about responsive design.
