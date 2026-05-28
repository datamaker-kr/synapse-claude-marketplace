# Static HTML Synapse App

nginx serving static files. For dashboards with no backend.

## Files

```
sub-apps/<slug>/
  synapse-app.yaml
  Dockerfile
  nginx.conf
  public/ { index.html, style.css, app.js }
```

## Dockerfile

```dockerfile
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/
EXPOSE 8080
```

## nginx.conf

```nginx
server {
  listen 8080;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  location = /health {
    access_log off;
    add_header Content-Type application/json;
    return 200 '{"status":"ok"}';
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

## public/index.html

Paste `templates/bridge-snippet.html` into `<head>`, replace `APP_NAME`. Copy the token block from `docs/apps/design.md` section 13.1 into `style.css`.

## Manifest slots

- `ports.public: 8080`
- `public_url: http://localhost:8080/`
- `health.path: /health`
- `iframe.sandbox`: `allow-scripts`, `allow-same-origin`

## Gotchas

- No hot-reload: `docker compose restart <slug>` after changes, or swap nginx for `node:20-alpine` + `npx serve` in dev.
- SPA client-side routing needs the `try_files` fallback.
