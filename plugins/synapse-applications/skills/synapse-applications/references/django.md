# Django Synapse App

For existing Django codebases. Use port 8010 (platform-api owns 8000).

## Files

```
sub-apps/<slug>/
  synapse-app.yaml
  Dockerfile
  requirements.txt
  manage.py
  <project>/ { settings.py, urls.py, wsgi.py }
  <app>/ { views.py, urls.py, templates/<app>/index.html }
```

## Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8010
CMD ["python", "manage.py", "runserver", "0.0.0.0:8010"]
```

## requirements.txt

```
Django>=5.1,<6.0
```

## urls.py

```python
from django.http import JsonResponse
from django.urls import path, include

def health(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path("health", health),
    path("", include("<app>.urls")),
]
```

## settings.py (iframe-friendly)

```python
X_FRAME_OPTIONS = "ALLOWALL"   # dev only; use CSP frame-ancestors in prod
ALLOWED_HOSTS = ["*"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:3000", "http://localhost:8010"]
```

## Bridge

Paste `templates/bridge-snippet.html` into the `<head>` of the base template.

## Manifest slots

- `ports.public: 8010` (NEVER 8000)
- `public_url: http://localhost:8010/`
- `health.path: /health`
- `iframe.sandbox`: `allow-scripts`, `allow-same-origin`, `allow-forms`

## Gotchas

- `APPEND_SLASH` redirects `/health` to `/health/`; register the URL pattern exactly matching the manifest path.
- Django's clickjacking middleware blocks framing - `X_FRAME_OPTIONS=ALLOWALL` in dev, CSP `frame-ancestors` in prod (django-csp).
- Prod static files: `pip install whitenoise`, `MIDDLEWARE.insert(0, "whitenoise.middleware.WhiteNoiseMiddleware")`.
- Cross-origin iframe cookies: `SESSION_COOKIE_SAMESITE="None"` + `SESSION_COOKIE_SECURE=True` (forces HTTPS in prod).
