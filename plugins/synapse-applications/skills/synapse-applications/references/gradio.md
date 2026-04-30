# Gradio Synapse App

Canonical worked example: `sub-apps/gradio-demo/`. Read it in full before writing a new Gradio app.

## Files

```
sub-apps/<slug>/
  synapse-app.yaml
  Dockerfile
  requirements.txt
  app.py
```

## Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--reload"]
```

## requirements.txt

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
gradio==5.*
```

Add `matplotlib`, `numpy`, `pillow` if needed.

## app.py

```python
from fastapi import FastAPI
import gradio as gr
from gradio.themes.utils import colors, sizes

api = FastAPI()

@api.get("/health")
async def health():
    return {"status": "ok"}

# Copy the full .set(...) from sub-apps/gradio-demo/app.py (lines 103-212).
synapse_theme = gr.themes.Base(
    primary_hue=colors.blue, neutral_hue=colors.slate,
    text_size=sizes.text_sm, spacing_size=sizes.spacing_sm, radius_size=sizes.radius_sm,
).set(
    body_background_fill="#f8fafc", body_background_fill_dark="#0f172a",
    button_primary_background_fill="#2563eb", button_primary_background_fill_hover="#1d4ed8",
)

# Paste full IIFE body of templates/bridge-snippet.html; APP_NAME="<slug>".
BRIDGE_SCRIPT = """<script>(function () { /* ... */ })();</script>"""

with gr.Blocks(title="<Label>", theme=synapse_theme, head=BRIDGE_SCRIPT) as demo:
    gr.Markdown("# <Label>")

app = gr.mount_gradio_app(api, demo, path="/")
```

`gr.mount_gradio_app` keeps FastAPI's `/health` at the root and mounts Gradio under `/`. FastAPI routes defined BEFORE the mount win.

## Manifest slots

- `ports.public: 7860`
- `public_url: http://localhost:7860/`
- `health.path: /health`
- `iframe.sandbox`: `allow-scripts`, `allow-same-origin`, `allow-forms`, `allow-popups`

## Gotchas

- Register `/health` BEFORE `mount_gradio_app`; otherwise Gradio swallows it.
- `matplotlib.use("Agg")` at import time for headless charts.
- Bridge via `head=` is raw JS - no `type="module"`.
- Fonts: `gr.themes.Base(font=["Pretendard Variable", ...])`.
- `uvicorn --reload` watches Python only; `requirements.txt` changes require a container restart.
