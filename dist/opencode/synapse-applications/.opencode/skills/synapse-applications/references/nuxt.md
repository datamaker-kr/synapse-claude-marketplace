# Nuxt 3 Synapse App

Nuxt 3 with Nitro server routes for `/health` + stub backend. Dev port varies per sub-app. Use pnpm via corepack.

## Files

```
sub-apps/<slug>/
  synapse-app.yaml
  Dockerfile
  .dockerignore
  .npmrc
  package.json
  nuxt.config.ts
  app.vue
  pages/**/*.vue
  layouts/**/*.vue
  middleware/**/*.ts       (00.synapse-auth.global.ts for stub-auth if the source has auth middleware)
  plugins/synapse-bridge.client.ts
  server/api/health.get.ts
  server/routes/stub/[...path].ts
```

## Dockerfile

```dockerfile
FROM node:22-alpine

RUN apk add --no-cache wget libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json .npmrc ./
RUN pnpm install --no-frozen-lockfile

COPY . .

EXPOSE <port>

CMD ["pnpm", "exec", "nuxi", "dev", "--host", "0.0.0.0", "--port", "<port>"]
```

## .npmrc

Required for Nuxt + shadcn-nuxt / radix-vue stacks. Without `shamefully-hoist`, peer-dep-heavy plugins fail to resolve under pnpm's strict node_modules layout.

```
shamefully-hoist=true
node-linker=hoisted
strict-peer-dependencies=false
auto-install-peers=true
```

## Health endpoint (Nitro)

```ts
// server/api/health.get.ts
export default defineEventHandler(() => ({ status: 'ok' }))
```

Served at `/api/health`. Note the manifest `network.health.path` must be `/api/health` for Nuxt, NOT `/health` - Nitro's `server/api/*` routes auto-prefix with `/api/`. If you want `/health`, use `server/routes/health.ts` instead.

## Bridge

Port `templates/bridge-snippet.html` to `plugins/synapse-bridge.client.ts` as a `defineNuxtPlugin()`. The `.client.ts` suffix keeps it browser-only so `window.parent` / `ResizeObserver` are safe. Typical providers:

```ts
return {
  provide: {
    synapseSend: send,
    synapseToast: (kind, message, ttl_ms?) => send('synapse:toast', { kind, message, ttl_ms }),
    synapseNavigate: (path, replace?) => send('synapse:navigate', { path, replace }),
    synapseStatus: (message) => send('synapse:app_status', { message })
  }
}
```

Use in components as `const { $synapseToast } = useNuxtApp()`.

## Stub backend (Nitro catch-all)

When the Nuxt app is ported from a larger system and `NUXT_PUBLIC_API_URL` has no real backend available, serve a catch-all so `$fetch` calls don't 500. Use `server/routes/` (NOT `server/api/`) so you own the URL prefix.

```ts
// server/routes/stub/[...path].ts
import { defineEventHandler, setHeader, getMethod, getRequestURL } from 'h3'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'x-synapse-stub', '1')

  const method = getMethod(event)
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    return { id: 0, uuid: '00000000-0000-0000-0000-000000000000', ok: true }
  }
  return {
    items: [], results: [], data: [],
    count: 0, total: 0, next: null, previous: null,
    _stub: true, _path: getRequestURL(event).pathname
  }
})
```

For endpoints that return a specific shape the UI destructures (e.g. `drone.default_stream_url`), add a more specific route that shadows the catch-all: `server/routes/stub/drones/active/index.ts`.

Default `NUXT_PUBLIC_API_URL=http://localhost:<port>/stub/` in `docker-compose.yml`. Operators override it to a real backend URL per deploy. Note that self-fetching through the dev server during SSR adds a hop - for hot paths prefer an external real backend.

## Stub auth (ported apps with auth middleware)

If the upstream source has route middleware that bounces unauthenticated users to `/auth/login`, add a pre-priority overlay middleware:

```ts
// middleware/00.synapse-auth.global.ts
// Runs before 01.auth.global.ts alphabetically.
import { getCookie, setCookie } from 'h3'

const STUB = 'synapse-embedded-stub'

export default defineNuxtRouteMiddleware(() => {
  const name = 'UARS_AUTH_TOKEN'  // match the upstream's token cookie name

  if (import.meta.server) {
    const event = useRequestEvent()
    if (!event || getCookie(event, name)) return
    setCookie(event, name, STUB, { path: '/', sameSite: 'lax' })
    // Mutate the IN-REQUEST cookie header too, so downstream middleware
    // in the SAME SSR request sees the token. useCookie / setCookie only
    // emit Set-Cookie on the RESPONSE, which arrives too late for the
    // auth middleware that runs in the same request.
    const req = event.node.req
    const existing = req.headers.cookie || ''
    req.headers.cookie = existing ? `${existing}; ${name}=${STUB}` : `${name}=${STUB}`
    return
  }
  if (typeof document !== 'undefined' && !document.cookie.includes(`${name}=`)) {
    document.cookie = `${name}=${STUB}; path=/; SameSite=Lax`
  }
})
```

## Layout ownership

Follow SKILL.md "Layout ownership - do NOT build chrome." For a ported Nuxt app:

- Edit `layouts/default.vue` to strip `<Header>` / `<Footer>` renders (keep the `<Sidebar>` + whatever nav component the upstream uses).
- Edit any `layouts/auth.vue` (or route-group equivalent) that wraps login in `<Header variant="auth" />` - strip the header, keep the form.
- **If pages pass `:sidebar="false"`** to disable the upstream's per-page sidebar, an unconditional primary nav needs to live in `layouts/default.vue` root (NOT behind the `sidebar` prop) so nav exists even when pages opt out. Build a small `components/shared/synapse-nav/SynapseNav.vue` with the top-level nav items you migrated from the removed header.
- Upstream components that have no `dark:` variants should make the bridge's `applyTheme` a no-op - see SKILL.md "Half-theme trap" pitfall.

## Manifest slots

- `ports.public: <port>`
- `public_url: http://localhost:<port>/`
- `health.path: /api/health`  (NOT `/health` unless you use `server/routes/health.ts`)
- `iframe.sandbox`: `allow-scripts`, `allow-same-origin`, `allow-forms`, `allow-popups`
- `capabilities.theme: subscribe`, `capabilities.locale: subscribe`

## Gotchas

- **Nitro auto-prefix**: `server/api/*` -> `/api/*`; `server/routes/*` keeps the filesystem path. Pick the directory to match your manifest health path.
- **Dev bind-mount anonymous volumes**: add `/app/node_modules`, `/app/.nuxt`, `/app/.output` AFTER the `./sub-apps/<slug>:/app` bind-mount (see SKILL "Bind-mount and node_modules").
- **Middleware priority**: global route middleware runs in alphabetical filename order. Prefix overlays with `00.` to win.
- **useCookie same-request**: `useCookie(name).value = x` on SSR only emits `Set-Cookie`; downstream same-request reads stay empty. Mutate `event.node.req.headers.cookie` via h3 to patch the in-flight request.
- **Duplicated-imports warnings**: shadcn-nuxt + Nuxt auto-import often double-registers `Dialog` / `AlertDialog` etc. when both `Dialog.client.vue` and `index.ts` export the same name. Benign; fix by picking one export path.
- **Pages that override layout props** (`:sidebar="false"`) make layout-owned nav disappear. See Layout ownership above.
- **First boot installs deps**: fat Nuxt + shadcn dep sets take 3-5 minutes on cold `pnpm install`. Set `start_period: 180s` on the healthcheck.
