---
name: sync-to-jira
description: 완성된 specs/plans 문서를 Jira 이슈로 push-back 합니다 (Markdown 본문을 마커 구간에 splice; ADF 변환은 Atlassian MCP가 수행). 공식 Atlassian MCP가 가용한 환경에서만 동작합니다.
allowed-tools: Read, Glob, Grep, AskUserQuestion
user-invocable: true
---

# Sync to Jira

## Skill Info

Part of the **spec-manager** agent. This skill takes the finalized `specs.md` and/or `plans.md` for a slug and pushes them back into the linked Jira issue's `description` (or a configured custom field), wrapping the content with marker comments so the same region can be updated repeatedly.

This skill performs the marker splice at the **markdown** level and reads/writes through the official Atlassian MCP: `getJiraIssue` returns the current description as markdown, and `editJiraIssue` accepts markdown for the description (the Atlassian MCP converts markdown → ADF server-side — do **not** pass raw ADF JSON, which the server rejects). This skill is the **orchestration layer**: detection, payload assembly, markdown marker splice, diff confirmation, and result reporting.

## Input

`/sync-to-jira <slug> [--target=spec|plan|both] [--field=description|customfield_<id>]`

Flags:

| Flag | Values | Default | Effect |
|------|--------|---------|--------|
| `--target` | `spec` / `plan` / `both` | `both` | Which documents to include in the payload. |
| `--field` | `description` or `customfield_<id>` | `description` | Where on the Jira issue to write. `description` uses marker splice; custom fields are overwritten. |

If `<slug>` is omitted, list slugs in `specs/` and ask the user to pick.

## Markers

The skill uses two marker strings to delimit the region inside Jira's description that it owns:

- `markerStart`: `<!-- sdd:start -->`
- `markerEnd`: `<!-- sdd:end -->`

The skill splices content between these markers so subsequent syncs replace only the bounded region. The first sync to a ticket appends a new marker block at the end of the description (reported as `mode: "append-marker"`).

## Process

### Step 1: Argument Parsing

1. Extract `<slug>` (positional).
2. Parse `--target` and `--field` flags.
3. Validate: `--target` ∈ {`spec`, `plan`, `both`}; `--field` is `description` or matches `^customfield_\d+$`.

### Step 2: Load Spec Files

1. Read `specs/{slug}/requirements.md` to extract the `Ticket:` header. If `N/A` or missing, stop with:
   ```
   sync-to-jira aborted: requirements.md has no Jira ticket (Ticket: N/A).
   ```
2. Also read the `Pipeline:` header.
   - If `--target` includes `spec` and `Pipeline: lite`, warn the user that lite tasks have no `specs.md` and either:
     - Auto-fall back to `--target=plan` if `--target=both`, or
     - Stop if `--target=spec` was explicit.
3. Based on `--target`, load:
   - `--target=spec` → `specs/{slug}/specs.md`
   - `--target=plan` → `specs/{slug}/plans.md`
   - `--target=both` → both (in order: specs, plans)
4. Validate that each loaded file's `Status` is not `Pending` (i.e., it has real content). If a target file is still pending, warn and ask whether to abort or proceed anyway.

### Step 3: Detect Jira MCP Availability

Look in the available tools for any of:
- `mcp__atlassian__getJiraIssue` and `mcp__atlassian__editJiraIssue`
- any pair of tools where one name ends with `getJiraIssue` and the other ends with `editJiraIssue`

If the matching pair is not available, stop with:
```
sync-to-jira aborted: Atlassian MCP is not available in this session.
공식 Atlassian MCP 설정: `claude mcp add --transport http atlassian https://mcp.atlassian.com/v1/mcp` 후 `/mcp` 인증 (자세히: plugins/platform-dev-team-common/README.md의 Atlassian MCP 서버 섹션)
```

Record the active prefix; reuse it for the calls in Steps 5 and 6.

At the start, call `getAccessibleAtlassianResources` once to obtain the `cloudId` for the Atlassian site, then reuse that `cloudId` for every subsequent `getJiraIssue` / `editJiraIssue` call. (Other Jira tools require `cloudId` as input, so they can't be used to discover it.)

### Step 4: Assemble Markdown Payload

Concatenate the loaded documents into one markdown string, omitting their YAML-like header blocks (the `> Created:` / `> Status:` / etc. lines) so Jira gets the substantive content only.

```
## SDD: Specs

<body of specs.md after its header block>

## SDD: Plans

<body of plans.md after its header block>
```

If only one target is selected, include only that heading + body. Do not include the marker comments here — the skill wraps the payload with markers during the splice in Step 6.

### Step 5: Fetch Current Description for Diff

Call:
```
getJiraIssue({ cloudId, issueIdOrKey: ticketId, fields: ["description"] })
```

The Atlassian MCP returns `description` as a **markdown** representation (not raw ADF). Extract the existing marker region directly from that markdown:
- If both `markerStart` and `markerEnd` lines are present, the current region is the text between them.
- If markers are absent, the current region is treated as empty.

Show the user a unified-style diff (rendered as a fenced code block in the terminal) between the current region's rendered markdown and the new payload. Keep it concise: if the diff exceeds ~200 lines, truncate with `[... N lines elided ...]` and offer a "show full diff" option.

### Step 6: Confirm and Apply

Use AskUserQuestion:

```
Jira 이슈 {ticketId}의 description {markerStart}~{markerEnd} 구간을 위 내용으로 갱신할까요?
```

Options: `Apply` / `Cancel`.

If **Cancel**: stop with a one-line acknowledgement. No external call is made.

If **Apply**, the skill performs the markdown splice and write itself:

1. **For `--field=description`** — splice into the existing description **markdown** (fetched in Step 5):
   - If both `markerStart` and `markerEnd` lines exist, **replace** the text between them with `markerStart` + the Step 4 payload + `markerEnd`. Mode: `splice-marker`.
   - If the markers are absent, **append** `markerStart` + payload + `markerEnd` to the end of the existing description markdown. Mode: `append-marker`.

2. **For `--field=customfield_<id>`** — no markers. Use the Step 4 payload as the full field value. Mode: `replace-full`.

3. **Write the result as markdown** (the Atlassian MCP converts markdown → ADF server-side — never pass raw ADF JSON, which the server rejects with `Failed to convert markdown to adf`):
   ```
   editJiraIssue({
     cloudId,
     issueIdOrKey: ticketId,
     fields: { <"description" or "customfield_<id>">: <final markdown string> },
   })
   ```

4. **Verify the markers survived.** Immediately re-fetch with `getJiraIssue({ cloudId, issueIdOrKey: ticketId, fields: ["description"] })` and confirm both `markerStart` and `markerEnd` are present in the returned markdown. If they are missing, or appear as escaped literal text, the markdown↔ADF round-trip dropped/escaped them — warn the user that repeated syncs can no longer splice safely (a subsequent sync would append a duplicate block instead of replacing), and stop automatic re-syncs for this ticket until it is resolved manually.

> **Known limitation (Atlassian Rovo MCP):** `editJiraIssue` round-trips the entire field through markdown, so ADF-only content anywhere in the description — panels, smart/inline links, @mentions, status lozenges, tables with rich formatting, media/attachments, expand sections — can be **silently stripped**, even outside the marker region. If the Step 5 diff shows the human-authored area contains such content, warn the user before applying. The HTML-comment markers (`<!-- sdd:start -->` / `<!-- sdd:end -->`) themselves have no ADF equivalent and may be **stripped or escaped to visible text** on the round-trip (cf. atlassian-mcp-server issue #53); when that happens marker-based splicing degrades to append-only — hence the Step&nbsp;4 verification above.

### Step 7: Report

On success, print:
```
Sync to Jira: success

Ticket:     {ticketId}
Field:      {field}
Mode:       {splice-marker | append-marker | replace-full}
Targets:    {spec / plan / both}
Warnings:   {none | list}
Link:       https://<jira-base>/browse/{ticketId}
```

On failure (Jira API error, etc.), print the error returned by `editJiraIssue` and suggest re-authenticating via `/mcp` (OAuth) or checking ticket permissions.

## Error Handling

| Scenario | Strategy |
|----------|----------|
| `Ticket: N/A` or missing | Stop in Step 2 with explicit message |
| Atlassian MCP not available | Stop in Step 3 with setup hint |
| Target file `Status: Pending` | Ask the user whether to abort or push the pending content |
| Jira 401/403 | Surface error, suggest re-authenticating via `/mcp` (OAuth) |
| Jira 404 (ticket not found) | Stop, ask user to verify the Ticket ID |
| Empty diff (no changes) | Skip Apply, print "No changes to sync" |
| Marker absent (first sync) | Proceed; the skill creates the marker block and reports `mode: append-marker` |
| `--field=customfield_<id>` with `--target=both` | Allowed; the custom field is fully overwritten with the assembled payload |

## Important

- This skill **never silently mutates Jira**. Step 6 confirmation is mandatory.
- Do not store any Jira credential anywhere — auth is managed by the Atlassian MCP via OAuth.
- For `--field=description`, always use the marker pattern; never overwrite the entire description (that would clobber human-written context above/below).
- For `--field=customfield_<id>`, the custom field is fully overwritten — make this clear in the confirmation prompt.
- The Atlassian MCP performs the markdown → ADF conversion server-side, and the round-trip is **lossy** (see the Step 6 limitation note); never pass raw ADF JSON to `editJiraIssue`, as the server rejects it.
- If the existing description appears to contain ADF-rich content that the markdown round-trip may drop, record it in the `warnings` list and surface it in Step 7.
- The lite pipeline has no `specs.md`. Respect this in Step 2: don't error on missing files; fall back to plan-only or stop based on `--target`.
