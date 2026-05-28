# Vue 3 (Vite + TS) Synapse App

Mirrors the React recipe. Vite + bind-mount = HMR. Dev port 5173.

## Files

```
sub-apps/<slug>/
  synapse-app.yaml
  Dockerfile
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  src/ { main.ts, App.vue, bridge.ts, index.css }
```

## Dockerfile

Same as React: `node:20-alpine`, `npm ci`, `CMD ["npm","run","dev","--","--host","0.0.0.0","--port","5173"]`.

## package.json

```json
{
  "name": "<slug>",
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "vue-tsc -b && vite build", "preview": "vite preview" },
  "dependencies": { "vue": "^3.5.0" },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vue-tsc": "^2.2.0"
  }
}
```

## vite.config.ts

Same shape as React's (see `react.md`). Swap `@vitejs/plugin-react` for `@vitejs/plugin-vue`. Keep the `/health` middleware plugin verbatim.

## src/main.ts

```ts
import { createApp } from "vue";
import App from "./App.vue";
import { initBridge } from "./bridge";
import "./index.css";

initBridge();
createApp(App).mount("#app");
```

## src/bridge.ts

Identical port of `templates/bridge-snippet.html` - the bridge is framework-agnostic. See `react.md`.

## Manifest slots

Same as React (`ports.public: 5173`, sandbox `allow-scripts allow-same-origin allow-forms allow-popups`, `capabilities.theme/locale: subscribe`).

## Gotchas

- Same `node_modules` overlay pitfall as React: add `- /app/node_modules` anonymous volume in docker-compose.
- Use Composition API with `<script setup lang="ts">` (host Nuxt migration set the convention).
- `vue-tsc` catches template type errors at build.
