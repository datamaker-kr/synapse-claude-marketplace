# React (Vite + TS) Synapse App

Vite for HMR with the `./sub-apps/<slug>:/app` bind-mount. Dev port 5173.

## Files

```
sub-apps/<slug>/
  synapse-app.yaml
  Dockerfile
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  src/ { main.tsx, App.tsx, bridge.ts, index.css }
```

## Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
```

## package.json

```json
{
  "name": "<slug>",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc -b && vite build", "preview": "vite preview" },
  "dependencies": { "react": "^19.0.0", "react-dom": "^19.0.0" },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

## vite.config.ts (includes /health middleware)

```ts
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const health: Plugin = {
  name: "synapse-health",
  configureServer(s) {
    s.middlewares.use("/health", (_, res) => {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end('{"status":"ok"}');
    });
  },
  configurePreviewServer(s) {
    s.middlewares.use("/health", (_, res) => {
      res.statusCode = 200;
      res.end('{"status":"ok"}');
    });
  }
};

export default defineConfig({
  plugins: [react(), health],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    hmr: { clientPort: 5173 },
    allowedHosts: ["localhost", ".localhost"]
  }
});
```

## Bridge

Port `templates/bridge-snippet.html` to `src/bridge.ts` as a single `initBridge(listeners?)` function wrapping the IIFE body (replace `APP_NAME` with the slug). Call once from `src/main.tsx` before `createRoot(...).render(...)`. Envelope shape, message types, and resize logic are framework-agnostic - do not invent new ones.

## src/index.css

Copy the token block from `docs/apps/design.md` section 13.1 into `:root` and `.dark`. Drive component colors off the `--synapse-*` variables.

## Manifest slots

- `ports.public: 5173`
- `public_url: http://localhost:5173/`
- `health.path: /health`
- `iframe.sandbox`: `allow-scripts`, `allow-same-origin`, `allow-forms`, `allow-popups`
- `capabilities.theme: subscribe`, `capabilities.locale: subscribe`

## Gotchas

- HMR websocket: `server.hmr.clientPort` must equal the manifest port. Default works for localhost:5173.
- `node_modules` overlay: the bind-mount shadows the image's installed deps. Either `npm install` on the host once, or add an anonymous volume after the bind-mount in docker-compose: `- /app/node_modules`.
- Match React 19 (host repo uses it).
