# Next.js Synapse App

Use when porting an existing Next.js app into `sub-apps/<slug>/` or when React-via-Vite is insufficient (SSR, app-router route handlers, next-intl, etc.). Next.js dev bind-mount + Turbopack works fine as long as you avoid the traps below.

Default port for Next.js sub-apps: **3100** (3000 is the host UI). Pick another `31xx` slot if 3100 is taken.

## Files

```
sub-apps/<slug>/
  synapse-app.yaml
  Dockerfile
  .dockerignore
  package.json
  pnpm-lock.yaml           # or package-lock.json
  tsconfig.json
  next.config.ts
  app/
    layout.tsx             # bridge <Script> goes here
    health/route.ts        # 200 responder
    <pages>...
  public/
    synapse-bridge.js      # copy of templates/bridge-snippet.html body
```

## Dockerfile

```dockerfile
FROM node:20-alpine

RUN apk add --no-cache libc6-compat curl \
 && corepack enable

WORKDIR /app

# Copy lock separately so we get layer caching. `pnpm-lock.yaml*` (with star)
# tolerates the lockfile being missing or briefly out-of-sync.
COPY package.json pnpm-lock.yaml* ./
# Do NOT use --frozen-lockfile. Ported apps often have a lockfile that is
# slightly out of sync with package.json, and the container fails to build
# with ERR_PNPM_OUTDATED_LOCKFILE. Regenerate on the host if you want lock
# fidelity, otherwise let pnpm resolve.
RUN pnpm install --prefer-frozen-lockfile=false

COPY . .

ENV HOST=0.0.0.0 \
    PORT=3100 \
    NEXT_TELEMETRY_DISABLED=1

EXPOSE 3100
# Invoke `next` directly. `pnpm run dev -- --hostname X` has `--` consumed by
# pnpm and Next then tries to treat `--hostname` as the project directory:
#   "Invalid project directory provided, no such directory: /app/--hostname"
CMD ["pnpm", "exec", "next", "dev", "--turbopack", "--hostname", "0.0.0.0", "--port", "3100"]
```

## docker-compose service

```yaml
  <slug>:
    build: ./sub-apps/<slug>
    ports:
      - "3100:3100"
    environment:
      # External API the sub-app talks to. Set "stub" (or leave unset) to let
      # the in-app stub route serve empty payloads so pages render without
      # the real backend. See "Backend-less dev" below.
      UPSTREAM_URL: ${UPSTREAM_URL:-stub}
      NEXT_TELEMETRY_DISABLED: "1"
    volumes:
      - ./sub-apps/<slug>:/app
      # Anonymous volumes: the bind-mount above shadows the installed
      # node_modules and .next from the image. Without these, pnpm install
      # done during `docker build` is invisible at runtime and the container
      # crashloops. Listed AFTER the bind-mount so they win.
      - /app/node_modules
      - /app/.next
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3100/health"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 60s
```

## /health

Next.js app-router route handler. Keep it static:

```ts
// app/health/route.ts
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
```

## Bridge

Copy `templates/bridge-snippet.html` body into `public/synapse-bridge.js` (one-time static asset; replace `APP_NAME` with the slug). Load it from the root layout:

```tsx
// app/layout.tsx
import Script from "next/script";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        {/* MUST go inside <body>. In Next.js 16 + Turbopack, placing <Script>
            inside an explicit <head> triggers:
              "Encountered a script tag while rendering React component.
               Scripts inside React components are never executed when
               rendering on the client."
            and the bridge never boots. No explicit <head> tag. */}
        <Script src="/synapse-bridge.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
```

Do not try to inline the bridge via raw React innerHTML props - the host security hook will block the edit. Always use a separate file in `public/` loaded via `<Script src=...>`.

## Backend-less dev: stub proxy pattern

When the app depends on an external API that isn't running locally, pages throw `API 500: Internal Server Error` and the UI is unviewable. Install a filesystem catch-all that serves stub shapes, gated by env:

```ts
// app/<api-prefix>/[...path]/route.ts
const EMPTY_LIST = { items: [], total: 0 };

function stubGet(path: string): unknown {
  if (path === "health") return { status: "stub" };
  // Endpoints whose clients destructure specific arrays need specific shapes;
  // a blind empty-list crashes with "Cannot read properties of undefined".
  if (/^some\/filters$/.test(path)) return { names: [], categories: [] };
  const detail = path.match(/^projects\/([^/]+)$/);
  if (detail) return { id: detail[1], name: "(stub)" };
  return EMPTY_LIST;
}

function stubPost(path: string, url: URL): unknown {
  if (path === "projects") {
    // Return a real-looking id so client-side router.push(`/projects/${id}`) works.
    return { id: Math.random().toString(36).slice(2, 10), name: url.searchParams.get("name") ?? "(stub)" };
  }
  return EMPTY_LIST;
}

type Ctx = { params: Promise<{ path: string[] }> };
export async function GET(_req: Request, { params }: Ctx) {
  return Response.json(stubGet((await params).path.join("/")));
}
export async function POST(req: Request, { params }: Ctx) {
  return Response.json(stubPost((await params).path.join("/"), new URL(req.url)));
}
export const PUT = GET;
export const PATCH = GET;
export async function DELETE() { return Response.json({ deleted: "stub" }); }
```

Pair with a rewrite in `next.config.ts` that only installs when a real URL is configured:

```ts
const UPSTREAM = process.env.UPSTREAM_URL || "";
const STUB = UPSTREAM === "" || UPSTREAM === "stub";

export default withNextIntl({
  async rewrites() {
    // Object form with explicit beforeFiles. When a real upstream is set the
    // rewrite wins over the filesystem catch-all; in stub mode the catch-all
    // serves every request. A top-level return-array is ambiguous about
    // ordering across Next.js versions - always return the object form.
    if (STUB) return { beforeFiles: [], afterFiles: [], fallback: [] };
    return {
      beforeFiles: [{ source: "/<api-prefix>/:path*", destination: `${UPSTREAM}/api/:path*` }],
      afterFiles: [],
      fallback: [],
    };
  },
});
```

## Hydration-safe state (ported SPAs)

A sidebar or layout that reads `window.matchMedia` / `localStorage` / `document.cookie` inside a `useState` initializer renders differently on the server than on the client and triggers:

> Hydration failed because the server rendered HTML didn't match the client.

Fix: initialize to a deterministic default, then `useEffect` to sync.

```tsx
// wrong - useState runs on the server too; server sees no window
const [open, setOpen] = useState(() =>
  window.matchMedia("(min-width: 1680px)").matches
);

// right
const [open, setOpen] = useState(false);
useEffect(() => {
  const mq = window.matchMedia("(min-width: 1680px)");
  const apply = () => setOpen(mq.matches);
  apply();
  mq.addEventListener("change", apply);
  return () => mq.removeEventListener("change", apply);
}, []);
```

Same rule for any sidebar `sticky top-16 h-[calc(100vh-4rem)]` offsets: those were calibrated for the host-app header that no longer exists inside the iframe. Use `top-0 h-screen`.

## Manifest slots

```yaml
runtime:
  kind: docker-compose
  compose:
    service: <slug>
network:
  ports:
    public: 3100
  public_url: http://localhost:3100/
  health:
    path: /health
iframe:
  sandbox:
    - allow-scripts
    - allow-same-origin
    - allow-forms
    - allow-popups
    - allow-downloads
  allow:
    - clipboard-read
    - clipboard-write
capabilities:
  auth: none
  theme: subscribe
  locale: subscribe
```

## Gotchas

- **Lockfile drift** - `--frozen-lockfile` in the Dockerfile rejects pnpm-lock.yaml that is out of sync with package.json. Use `--prefer-frozen-lockfile=false` during porting.
- **CMD argv plumbing** - `pnpm run dev -- --hostname X` loses `--` at some pnpm versions. Prefer `pnpm exec next dev --turbopack --hostname 0.0.0.0 --port <port>` or `npx next ...`.
- **Bind-mount shadowing** - the `./sub-apps/<slug>:/app` volume overlays the image's `node_modules` and `.next`. Anonymous volumes after the bind-mount fix it.
- **`<Script>` in `<head>`** - fails under Turbopack, move to `<body>`.
- **Hydration mismatch** - never read `window`/`document`/cookies inside `useState` initializers; use `useEffect`.
- **Rewrites and filesystem ordering** - return the object form (`{beforeFiles, afterFiles, fallback}`) rather than an array, so you're explicit about which wins against an `app/.../[...path]/route.ts` catch-all.
- **No rebuild needed for source edits** - the bind-mount means Turbopack reloads the browser. Only rebuild the image when you change `package.json`, the Dockerfile, or anything under `/app/node_modules`.
- **next-intl locale cookie** - the cookie is read server-side in `i18n/request.ts`. The iframe inherits the top-frame's document.cookie only when the iframe is same-origin; cross-origin iframes must receive `synapse:locale` via bridge and set their own cookie.
