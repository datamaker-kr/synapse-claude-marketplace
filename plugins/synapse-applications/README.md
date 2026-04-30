# Synapse Applications

Scaffold and publish a Synapse App as an OCI image so the Synapse Workspace can install it via the App Store.

A Synapse App is a containerized HTTP app the host loads in an iframe. The platform discovers it by **pulling an OCI image** whose config carries a `io.synapse.app.manifest` label - the full `synapse-app.yaml` encoded as base64 YAML. There is no `sub-apps/` directory, no compose-file rewrite. Apps live in the registry; the workspace pulls and runs them.

## What it does

When the user asks Claude Code to "scaffold a new Synapse App" / "create a sub-app" / "build a plugin for the workspace", this skill:

1. Asks once for framework if ambiguous (default React, Vite+TS).
2. Scaffolds an app source dir (`<slug>/`) with a `synapse-app.yaml` manifest, Dockerfile, framework entry files, and a bridge snippet.
3. Builds the image with the manifest baked into the `io.synapse.app.manifest` label.
4. Pushes both `:<semver>` and `:latest` to `registry.local.datamaker.io/synapse_apps/<slug>`.
5. Tells the user to install via the App Store at `http://localhost:4000`.

## Supported frameworks

React, Vue, Next.js, Nuxt 3, Gradio, Streamlit, Static HTML, Django, FastAPI. Recipes live in `skills/synapse-applications/references/<framework>.md`.

## Files

- `skills/synapse-applications/SKILL.md` - workflow, manifest rules, layout ownership, pitfalls, port registry.
- `skills/synapse-applications/templates/synapse-app.yaml.tmpl` - manifest template.
- `skills/synapse-applications/templates/publish.sh` - one-shot build + push helper.
- `skills/synapse-applications/templates/bridge-snippet.html` - postMessage bridge to drop into the app's HTML.
- `skills/synapse-applications/references/<framework>.md` - per-framework Dockerfile, entry, run command, gotchas.

## Out of scope

- The Synapse Workspace itself (host runtime, iframe shell, App Store UI). That lives in the workspace repo.
- The `@synapse/cli` (`synapse init / dev / publish`). When that ships, this skill will lean on it instead of `publish.sh`.
