---
description: Add a changelog entry to CHANGELOG.md in the Unreleased section following Keep a Changelog format with SemVer versioning.
---

# Add Marketplace Changelog Command

You will help the user add a changelog entry to the CHANGELOG.md file in the Unreleased section.

## Versioning Strategy

This project follows the guidelines from [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

This project uses [Semantic Versioning](https://semver.org/lang/ko/) with the format `Major.Minor.Patch`.

- Example: `1.0.0`, `1.1.0`, `1.1.1`, `2.0.0`
- **Major**: Incompatible API changes, breaking changes
- **Minor**: Backwards-compatible new functionality
- **Patch**: Backwards-compatible bug fixes

## Available Options

- `--type <category>`: Changelog category (added/changed/fixed, default: added)
- `--lang <language>`: Description language (korean/english, default: korean)
- `--ticket <id>`: Ticket ID (optional, will try to extract from branch name if not provided)

## Examples

- `/add-marketplace-changelog --type added --lang ko`: Add entry to "Added" section in Korean
- `/add-marketplace-changelog --type fixed --lang eng`: Add entry to "Fixed" section in English
- `/add-marketplace-changelog --ticket SYN-1234 --type changed`: Add entry with specific ticket ID
- `/add-marketplace-changelog`: Add entry to "Added" section in Korean (default)

## Implementation

1. Extract ticket ID from branch name or use provided ticket
2. Analyze current changes and commits to understand the scope
3. Generate appropriate changelog description in specified language
4. Add entry to the correct section in CHANGELOG.md under [Unreleased]
5. Follow existing changelog format and conventions

## Changelog Categories

Based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/):

- **Added**: New features, endpoints, functionality
- **Changed**: Changes in existing functionality, improvements, updates
- **Fixed**: Bug fixes, error corrections, issue resolutions
- **Deprecated**: Soon-to-be removed features (if applicable)
- **Removed**: Removed features (if applicable)
- **Security**: Security fixes (if applicable)

## Format Guidelines

- Follow existing format: `- [TICKET-ID](JIRA-URL) Description`
- Keep descriptions concise but informative
- Use appropriate language (Korean/English)
- Maintain chronological order (newest first in each section)
- Ensure proper JIRA ticket linking
- Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) principles

## Unreleased Section Format

```markdown
## [Unreleased] - yyyy-mm-dd

### Added

### Changed

### Fixed
```

Please provide the changelog type and language, or use defaults for "added" and Korean.
