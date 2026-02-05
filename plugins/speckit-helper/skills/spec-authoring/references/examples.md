# Specification Examples

## Example 1: Simple Feature — Dark Mode Toggle

```markdown
## Dark Mode Toggle

**Date:** 2026-02-05
**Status:** Draft
**Input:** Add a dark mode toggle to the settings page

## 1. Feature Overview

Add a user-facing toggle in the application settings that switches between light and dark color themes. The preference must persist across sessions and respect the user's OS-level preference as default.

## 2. User Stories & Acceptance Criteria

### US1: Toggle Dark Mode (P1)

**As a** user,
**I want** to switch between light and dark mode from the settings page,
**So that** I can use the application comfortably in different lighting conditions.

**Acceptance Criteria:**
- **Given** light mode is active, **When** I click the theme toggle, **Then** the UI switches to dark mode within 100ms
- **Given** dark mode is active, **When** I click the theme toggle, **Then** the UI switches to light mode within 100ms
- **Given** I set dark mode, **When** I close and reopen the app, **Then** dark mode is still active

**Edge Cases:**
- User has never set a preference → use OS preference
- OS preference changes while app is open → do not auto-switch (respect manual choice)

## 3. Functional Requirements

| ID | Requirement | User Story |
|----|------------|------------|
| FR-001 | The system must provide a toggle control on the settings page | US1 |
| FR-002 | The system must persist the user's theme preference in local storage | US1 |
| FR-003 | The system must default to the OS color scheme preference on first visit | US1 |
| FR-004 | The system must apply the theme change without a page reload | US1 |

## 4. Non-Functional Requirements

| ID | Requirement | Category |
|----|------------|----------|
| NFR-001 | Theme switch must complete within 100ms | Performance |
| NFR-002 | Dark mode must meet WCAG AA contrast ratios | Accessibility |

## 5. Success Criteria

| ID | Criteria | Measurement |
|----|---------|-------------|
| SC-001 | Theme toggle works on all supported browsers | Manual testing on Chrome, Firefox, Safari |
| SC-002 | No flash of unstyled content on page load | Visual inspection |
```

---

## Example 2: Complex Feature — User Authentication with OAuth

```markdown
## User Authentication with OAuth

**Date:** 2026-02-05
**Status:** Draft
**Input:** Add user authentication with email/password login and Google OAuth2 support

## 1. Feature Overview

Implement a complete authentication system supporting email/password registration and login, plus Google OAuth2 as a social login option. Users must be able to link multiple auth methods to a single account.

## 2. User Stories & Acceptance Criteria

### US1: Email/Password Registration (P1)

**As a** new user,
**I want** to register with my email and password,
**So that** I can create an account and access the application.

**Acceptance Criteria:**
- **Given** I am on the registration page, **When** I submit a valid email and password (8+ chars, 1 uppercase, 1 number), **Then** my account is created and I receive a confirmation email
- **Given** I submit an email that is already registered, **When** the form is submitted, **Then** I see an error "This email is already registered"

**Edge Cases:**
- Email with special characters (e.g., user+tag@example.com) must be accepted
- Password at exactly 8 characters must be accepted
- Duplicate registration attempts within 1 minute must be rate-limited

### US2: Email/Password Login (P1)

**As a** registered user,
**I want** to log in with my email and password,
**So that** I can access my account.

**Acceptance Criteria:**
- **Given** valid credentials, **When** I submit the login form, **Then** I am redirected to the dashboard with a valid session
- **Given** invalid credentials, **When** I submit the login form, **Then** I see "Invalid email or password" (no hint about which is wrong)

**Edge Cases:**
- 5 failed login attempts → account locked for 15 minutes
- Login from a new device → send notification email

### US3: Google OAuth2 Login (P2)

**As a** user,
**I want** to sign in with my Google account,
**So that** I can access the app without creating a separate password.

**Acceptance Criteria:**
- **Given** I click "Sign in with Google", **When** I authorize the app, **Then** I am logged in and redirected to the dashboard
- **Given** my Google email matches an existing account, **When** I sign in via Google, **Then** the Google auth is linked to my existing account

**Edge Cases:**
- User revokes Google permissions externally → next login prompts re-authorization
- Google API is unavailable → show fallback message, offer email/password login

## 3. Functional Requirements

| ID | Requirement | User Story | Notes |
|----|------------|------------|-------|
| FR-001 | The system must validate email format (RFC 5322) | US1 | |
| FR-002 | The system must hash passwords using bcrypt with cost factor 12 | US1 | |
| FR-003 | The system must send email confirmation after registration | US1 | |
| FR-004 | The system must issue JWT tokens with 24h expiry on login | US2 | |
| FR-005 | The system must lock accounts after 5 failed login attempts for 15 minutes | US2 | |
| FR-006 | The system must implement Google OAuth2 authorization code flow | US3 | |
| FR-007 | The system must link OAuth accounts to existing accounts by email match | US3 | |

## 4. Non-Functional Requirements

| ID | Requirement | Category |
|----|------------|----------|
| NFR-001 | Login endpoint must respond within 500ms for 95th percentile | Performance |
| NFR-002 | Passwords must never be logged or returned in API responses | Security |
| NFR-003 | OAuth tokens must be stored encrypted at rest | Security |

## 5. Key Entities

| Entity | Description | Key Attributes |
|--------|------------|----------------|
| User | Application user account | id, email, password_hash, created_at |
| Session | Active login session | id, user_id, token, expires_at, device_info |
| OAuthLink | Connected OAuth provider | id, user_id, provider, provider_user_id, access_token |

## 6. Success Criteria

| ID | Criteria | Measurement |
|----|---------|-------------|
| SC-001 | Registration-to-login flow completes in under 3 steps | UX walkthrough |
| SC-002 | Zero plaintext passwords in logs or database | Security audit |
| SC-003 | Google OAuth login works end-to-end | Integration test |
```
