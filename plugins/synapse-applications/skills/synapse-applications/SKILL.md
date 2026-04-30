---
name: synapse-applications
description: Build a new Synapse App as an OCI image and publish it to the Datamaker registry so the workspace can install it via the App Store. Use when the user asks to create/scaffold a Synapse App, sub-app, plugin, iframe app, or embedded dashboard, or mentions synapse-app.yaml, /plugins registry, apiVersion synapse.datamaker.io/v1, or the iframe bridge. Supports React, Vue, Next.js, Nuxt 3, Gradio, Streamlit, Static HTML, Django, FastAPI (priority in that order).
---

# Synapse Applications

A Synapse App is a containerized HTTP app the host loads in an iframe. The platform discovers it by **pulling an OCI image** whose config carries a `io.synapse.app.manifest` label - the full `synapse-app.yaml` encoded as base64 YAML. There is no `sub-apps/` directory anymore. There is no compose-file rewrite. Apps live in the registry; the workspace pulls and runs them.

Default to React (Vite+TS) for greenfield. Use Next.js when the source is already Next.js or SSR/next-intl/app-router handlers are required. Priority order: React (Vite+TS), Vue 3 (Vite+TS), Next.js, Nuxt 3, Gradio, Streamlit, Static HTML, Django, FastAPI. Ask once if ambiguous.

## Source layout

App source can live anywhere - a separate repo, `~/projects/<slug>/`, or a temp dir. The host's monorepo no longer holds individual app source. Minimum tree:

```
<slug>/
  synapse-app.yaml    # manifest, single source of truth
  Dockerfile
  <framework source>
```

Slug: `^[a-z][a-z0-9-]{1,62}$`. The slug is the app's identity inside the workspace; pick something stable.

## Workflow

1. Confirm framework (default React).
2. `mkdir <slug> && cd <slug>`.
3. Copy `templates/synapse-app.yaml.tmpl` -> `synapse-app.yaml`; fill slots. **Set `runtime.image: registry.local.datamaker.io/synapse_apps/<slug>:<version>`.**
4. Write Dockerfile + entry files from `references/<framework>.md`.
5. Inject `templates/bridge-snippet.html` into the app's HTML head.
6. Implement `/health` returning 200.
7. Build with the manifest baked into a label, then push:
   ```bash
   bash templates/publish.sh <slug> 0.1.0
   ```
   That helper runs:
   ```bash
   MANIFEST_B64=$(base64 -w0 synapse-app.yaml)
   docker build \
     --label "io.synapse.app.manifest=${MANIFEST_B64}" \
     -t registry.local.datamaker.io/synapse_apps/<slug>:<version> \
     -t registry.local.datamaker.io/synapse_apps/<slug>:latest .
   docker push registry.local.datamaker.io/synapse_apps/<slug>:<version>
   docker push registry.local.datamaker.io/synapse_apps/<slug>:latest
   ```
8. Open the App Store at `http://localhost:4000`. The new app appears as a card. Click **Install**.
9. Visit `http://localhost:3000/apps`, press **Start** on the installed app, verify it reaches `healthy`.
10. Optional: `pnpm dlx ajv-cli validate -s schemas/synapse-app.schema.json -d synapse-app.yaml` (against the host repo's schema).

## Iterating on a published app

Until the `@synapse/cli` lands with a `synapse dev` mode (host-loopback hot reload), every code change requires a rebuild + repush + reinstall. To repush a fresh build over an existing tag:

```bash
bash templates/publish.sh <slug> 0.1.1   # bump SemVer
# then in the App Store: uninstall old, install new
```

Floating `:latest` works too; the workspace re-pulls on install. Hot reload inside the workspace is not yet supported - run the dev server on your host (`pnpm dev`) for fast iteration, then publish when stable.

## Manifest rules

Full contract: `docs/apps/manifest.md`, `schemas/synapse-app.schema.json`.

- `apiVersion: synapse.datamaker.io/v1` (frozen).
- `kind: SynapseApp`.
- `metadata.name`: slug; appears as the install identity. `metadata.version`: SemVer.
- **`runtime.kind: image`** (canonical). `runtime.image: registry.local.datamaker.io/synapse_apps/<slug>:<version>`.
- The legacy `runtime.kind: docker-compose` is still in the schema for now but the host no longer surfaces compose-mode apps. Do not use it.
- `network.ports.public`: the container port. The runner maps this 1:1 to the host (`-p <port>:<port>`).
- `network.public_url`: full URL with scheme AND trailing slash (`http://localhost:<port>/`). Schema: `^https?://.+/$`. Browser-facing - the iframe `src`.
- `network.health.path`: required, starts with `/`. The host probes `http://synapse-app-<slug>:<port><path>` from inside the platform-api container; localhost in `public_url` is irrelevant for probes.
- `iframe.sandbox`: minimum `allow-scripts allow-same-origin`.
- `capabilities.auth/theme/locale`: default `none`; opt in explicitly. `auth: required` is not fully wired yet (`docs/apps/auth.md`).
- `capabilities.scopes`: GraphQL capability gateway scopes (`<ns>:<verb>`, ns in `projects|datasets|jobs|models|files|users`, verb in `read|write|self`). Omit or `[]` for apps that do not use the gateway. See `docs/apps/capabilities.md` + `backend/GRAPHQL.md`. **Gateway is very early; expect scope catalog and manifest shape to shift. Re-check docs before declaring scopes.**

## Label encoding

`io.synapse.app.manifest` accepts:

- **Canonical: base64-encoded YAML.** Robust against multi-line YAML and shell quoting.
- **Plain YAML/JSON.** Accepted as a fallback for one-line manifests.

`templates/publish.sh` always uses base64. Multi-line LABELs in a Dockerfile are fragile; bake the b64 string at build time via `--label`.

## Health endpoint

Mandatory. At `network.health.path` (usually `/health`). 200 = ready. No DB, no external fetches, no auth. Response body ignored. The platform polls `http://synapse-app-<slug>:<port><path>` from inside its own container - your container DNS name is `synapse-app-<slug>`, not your slug.

## Bridge

Ship `templates/bridge-snippet.html` in every app. Envelope `{synapse:1,id,ts,type,from,replyTo?,payload?}` per `docs/apps/bridge.md`. Behavior: posts `synapse:ready` on load, handles `synapse:theme` (toggles `.dark`), stashes `synapse:locale`/`synapse:user` on `window.__synapse`, emits debounced `synapse:resize`. Host runtime is partial; unknown types drop silently per spec - the snippet is safe to ship now.

## GraphQL capability gateway (early / provisional)

For Synapse domain reads (projects, datasets, jobs, users) prefer the capability gateway over bespoke REST. SDK surface: `client.query({ documentId?, query?, variables? })` from `@synapse/app-sdk`. Pilot queries: `me`, `projects(page)`, `project(id)`, `datasets(page)`, `dataset(id)`, `jobs(page)`, `job(id)`. No mutations yet. Scopes resolved server-side from the manifest. Full plan: `backend/GRAPHQL.md`. Manifest declares scopes under `capabilities.scopes`. **Changes often** - re-read `docs/apps/capabilities.md`, `docs/apps/bridge.md`, and `backend/GRAPHQL.md` before wiring.

## Federation (data:* scopes)

Sub-apps never talk to Postgres/S3/Snowflake/ES/Kafka/HTTP-JSON directly. The data federation gateway at `/plugins/data` (REST) and the grafted GraphQL root fan out to all external sources. DuckDB is the in-process engine. Full plan: `backend/FEDERATION.md`.

| Scope | For |
|-------|-----|
| `data:connections:read` | Read Connection metadata. |
| `data:datasets:read` | Read Dataset metadata + lineage. |
| `data:preview` | Call `datasetPreview` (row_cap-bounded). |
| `data:query` | Call `runQuery` with a trusted `documentId` (prod) or raw `sql` (dev only). |
| `data:query:write` | **Recognised but locked.** Phase 4+. |
| `data:admin:registry` | Catalog editor (`data-catalog` only). |

SDK surface: `client.data.query` / `client.data.preview` / `client.data.listConnections` / `client.data.listDatasets`. Bridge messages in `docs/apps/bridge.md`.

## Design tokens

Per `docs/apps/design.md`: Pretendard Variable, primary `#2563eb` (hover `#1d4ed8`, active `#1e40af`), slate neutrals, dark mode mandatory, radii 8/6/12/4px (buttons/inputs/cards/badges), motion 100-200ms `cubic-bezier(0.4,0,0.2,1)`. Chart palette: `#3b82f6 #22c55e #ef4444 #f59e0b #8b5cf6 #06b6d4 #ec4899 #64748b`. Copy the variable block from `docs/apps/design.md` section 13.1 into the app's stylesheet.

## Layout ownership - do NOT build chrome

The host renders the iframe inside its own shell. Duplicating that chrome produces double headers, double logos, two copyright lines, two theme switchers stacked.

| Element | Owner |
|---------|-------|
| App logo / brand mark | Host. |
| Top global nav bar / header | Host. |
| Footer / copyright / legal | Host. |
| Theme switcher | Host via `synapse:theme`. |
| Locale switcher | Host via `synapse:locale`. |
| User avatar / account menu | Host. |
| In-app navigation between sections | Sub-app. Use a left sidebar. |
| In-content tabs / breadcrumbs | Sub-app. |
| Page title + page actions | Sub-app (inside content area). |

If a ported source has `Header.tsx` + `Footer.tsx` with logo / nav / footer, delete both. Move nav into a `Sidebar`. Drop the logo. Remove theme/locale dropdowns - subscribe via the bridge.

## Default toolchain

- **Base image** for Node apps: current Node LTS on Alpine (`node:22-alpine`). `corepack enable && corepack prepare pnpm@9 --activate` in the Dockerfile.
- **Package manager**: pnpm. For Nuxt / shadcn stacks ship an `.npmrc` with `shamefully-hoist=true` + `auto-install-peers=true`.
- **Production target**: linux/amd64. macOS Docker Desktop (VirtioFS) is dev-only; do not design around Mac-specific bind-mount behavior.

## Per-framework CMD

| Framework        | Command                                                        |
|------------------|----------------------------------------------------------------|
| React/Vue (Vite) | `pnpm exec vite --host 0.0.0.0 --port <port>`                  |
| Next.js          | `pnpm exec next start --hostname 0.0.0.0 --port <port>` (build first) |
| Nuxt 3           | `pnpm exec nuxi preview --host 0.0.0.0 --port <port>` (build first) |
| Gradio           | `uvicorn app:app --host 0.0.0.0 --port <port>`                 |
| Streamlit        | `streamlit run app.py --server.address 0.0.0.0 --server.port <port>` |
| Static HTML      | nginx serves files                                             |
| Django           | `gunicorn -b 0.0.0.0:<port> wsgi:application`                  |
| FastAPI          | `uvicorn app:app --host 0.0.0.0 --port <port>`                 |

Always bind `0.0.0.0`. `127.0.0.1` is unreachable from outside the container. Published images are production-shape (no `--reload`); hot reload happens on the dev's host before publish.

## Port registry (currently taken by the workspace)

| Port | Owner |
|------|-------|
| 3000 | host frontend |
| 4000 | App Store (`appstore`) |
| 8000 | host backend (FastAPI) |

The workspace itself takes 3000 / 4000 / 8000. Pick anything else for your app's `network.ports.public` - the host port-maps it 1:1 inside the `synapse-experimental_default` network.

## Common pitfalls

- Missing trailing slash on `public_url` (schema: `^https?://.+/$`).
- `runtime.kind: docker-compose` instead of `image`. The host no longer surfaces compose-mode apps.
- Server bound to `127.0.0.1` instead of `0.0.0.0` inside the container.
- Missing `/health` - app reports unhealthy forever.
- Hardcoded `localhost` in server-side calls - use the workspace's `synapse-experimental_default` Docker DNS for cross-app traffic, or the host port from the dev's machine.
- Iframe sandbox without `allow-same-origin` breaks `localStorage` and same-origin fetch.
- Forgetting the `io.synapse.app.manifest` label at build time. Without it the App Store's catalog scan skips the image entirely.
- Tagging the image differently from `runtime.image` in the manifest. The platform uses the image ref it pulled (the install path), but mismatch is a footgun for downstream tooling.
- Missing pull credentials on the platform-api side: `REGISTRY_USERNAME`/`REGISTRY_PASSWORD` are loaded from `backend/.env` at host startup.
- **Redundant chrome** - shipping a top header, logo, or footer inside the iframe.
- **Half-theme trap when porting light-only apps** - if the ported app has zero `dark:` Tailwind variants, toggling `html.dark` via the bridge produces dark Synapse-chrome over light upstream content. Either add `dark:` variants or make `applyTheme` a no-op.
- **Hydration mismatch** - reading `window`/`document`/cookies inside `useState` initializers. Initialize to a deterministic default, sync in `useEffect`.
- **Sidebar sticky offset inherited from host shell** - a ported sidebar's `top-16 h-[calc(100vh-4rem)]` was calibrated for a host header. The iframe has none; use `top-0 h-screen`.
- **Clipboard API silently blocked** - `navigator.clipboard.writeText` throws `NotAllowedError` unless the iframe has `allow="clipboard-read; clipboard-write"`. The shared `SubAppFrame` sets sensible defaults; manifest `iframe.allow` is advisory until the host reads it.

## Recipes

`references/<framework>.md` for React, Vue, Next.js, Nuxt 3, Gradio, Streamlit, Static HTML, Django, FastAPI. Each has Dockerfile, entry files, run command, `/health` pattern, bridge wiring, framework-specific gotchas. Recipes pre-date the image-publish flow; treat the Dockerfile + run command as canonical and ignore any `sub-apps/` / `docker-compose.yml` references.
