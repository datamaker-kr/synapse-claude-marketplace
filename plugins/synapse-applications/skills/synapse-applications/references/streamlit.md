# Streamlit Synapse App

Port 8501. Streamlit auto-reloads on source changes.

## Files

```
sub-apps/<slug>/
  synapse-app.yaml
  Dockerfile
  requirements.txt
  app.py
  .streamlit/config.toml
```

## Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
COPY .streamlit/ .streamlit/
EXPOSE 8501
CMD ["streamlit", "run", "app.py", "--server.address", "0.0.0.0", "--server.port", "8501", "--server.headless", "true", "--server.runOnSave", "true"]
```

## .streamlit/config.toml

```toml
[theme]
primaryColor = "#2563eb"
backgroundColor = "#f8fafc"
secondaryBackgroundColor = "#ffffff"
textColor = "#0f172a"
font = "sans serif"

[server]
headless = true
enableCORS = false
enableXsrfProtection = false
```

## app.py

```python
import streamlit as st

st.set_page_config(page_title="<Label>", layout="wide")
st.title("<Label>")
st.write("Hello.")

# Paste full IIFE body of templates/bridge-snippet.html; APP_NAME="<slug>".
st.markdown("<script>(function(){ /* ... */ })();</script>", unsafe_allow_html=True)
```

## Manifest slots

- `ports.public: 8501`
- `public_url: http://localhost:8501/`
- `health.path: /_stcore/health` (Streamlit's built-in; no extra code)
- `iframe.sandbox`: `allow-scripts`, `allow-same-origin`, `allow-forms`, `allow-popups`

## Gotchas

- `enableCORS=false` + `enableXsrfProtection=false` are required in an iframe (different origin).
- Streamlit uses websockets; `allow-scripts` is mandatory.
- Guard the bridge snippet with `st.session_state` if it must not rerun.
- Dark mode is user-driven via Streamlit's menu; `synapse:theme` can layer CSS via `st.markdown`.
