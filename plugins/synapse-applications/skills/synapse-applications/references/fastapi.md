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

If your app processes Korean (or any CJK) documents - PDFs, scans, OCR pipelines - add poppler's CJK map plus a CJK font before `pip install`, otherwise `pdf2image` renders blank pages and `pdftotext` fails with `Missing language pack for 'Adobe-Korea1' mapping`:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
        poppler-utils poppler-data \
        fonts-noto-cjk fontconfig \
        libtiff-tools libmagic1 ca-certificates \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*
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
- **`status_code=204` on a route + a return type other than bare `Response` crashes at app construction time** with `AssertionError: Status code 204 must not have a response body`. Drop `status_code=204` from the decorator and `return Response(status_code=204)` from the body instead.
- **Set `root_path` from the proxy env so OpenAPI/docs generate correct URLs:** `app = FastAPI(root_path=os.environ.get("SYNAPSE_APP_ROOT_PATH", ""))`. Routes still match relative paths; this only affects URL generation in `/docs` and `/openapi.json`.
- **Loading secrets from a bind-mounted dir (canonical)** - see "Secrets and runtime config" in `SKILL.md`. Read `*.env` from `/etc/<slug>` at startup; never bake API keys into the image.
