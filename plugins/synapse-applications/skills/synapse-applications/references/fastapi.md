# FastAPI Synapse App

Backend-heavy apps with a thin UI. Use port 8020 (platform-api owns 8000).

## Files

```
sub-apps/<slug>/
  synapse-app.yaml
  Dockerfile
  requirements.txt
  app.py
  templates/index.html
  static/ { style.css, app.js }
```

## Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8020
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8020", "--reload"]
```

## requirements.txt

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
jinja2==3.1.*
```

## app.py

```python
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

BASE = Path(__file__).parent
app = FastAPI(title="<Label>")
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")
templates = Jinja2Templates(directory=BASE / "templates")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request, "index.html", {"app_name": "<slug>"})
```

## templates/index.html

Standard HTML. Paste `templates/bridge-snippet.html` into `<head>`, replace `APP_NAME` with `{{ app_name }}`.

## Manifest slots

- `ports.public: 8020` (NEVER 8000)
- `public_url: http://localhost:8020/`
- `health.path: /health`
- `iframe.sandbox`: `allow-scripts`, `allow-same-origin`, `allow-forms`

## Gotchas

- `--reload` watches Python only; static file edits are served live without a reload.
- Same-origin fetch from iframe JS needs no CORS. Cross-origin adds `fastapi.middleware.cors.CORSMiddleware`.
- Keep `/health` side-effect free (no DB, no middleware that touches one).
