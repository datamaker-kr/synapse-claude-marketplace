# BaseInferenceAction & BaseDeploymentAction

Inference action classes for model prediction and Ray Serve deployment.

## Import

```python
from synapse_sdk.plugins.actions.inference import (
    BaseInferenceAction,
    InferenceContext,
    BaseDeploymentAction,
    DeploymentContext,
)
from synapse_sdk.plugins.actions.inference.action import InferenceProgressCategories
from synapse_sdk.plugins.actions.inference.deployment import DeploymentProgressCategories
```

---

## BaseInferenceAction

### Class Definition

```python
class BaseInferenceAction(BaseAction[P]):
    category = PluginCategory.NEURAL_NET
    progress = InferenceProgressCategories()
```

### Key Methods

#### download_model(model_id, output_dir)

Download and extract model artifacts.

```python
model_path = self.download_model(123)
# Returns Path to extracted model directory
```

#### load_model(model_id)

Download model and return metadata with local path.

```python
model_info = self.load_model(123)
# model_info['path'] = '/tmp/synapse_model_xxx/'
# model_info['name'] = 'my-model'
```

#### infer(model, inputs)

**Abstract method** - Override to implement inference logic.

```python
def infer(self, model, inputs: list[dict]) -> list[dict]:
    results = []
    for inp in inputs:
        prediction = model.predict(inp['image'])
        results.append({'prediction': prediction})
    return results
```

### Simple Execute Example

```python
from pydantic import BaseModel
from synapse_sdk.plugins.actions.inference import BaseInferenceAction

class InferenceParams(BaseModel):
    model_id: int
    inputs: list[dict]

class MyInferenceAction(BaseInferenceAction[InferenceParams]):
    action_name = 'inference'

    def infer(self, model, inputs: list[dict]) -> list[dict]:
        from ultralytics import YOLO
        yolo = YOLO(model['path'] / 'best.pt')
        results = []
        for inp in inputs:
            pred = yolo(inp['image'])
            results.append({'boxes': pred.boxes.data.tolist()})
        return results

    def execute(self) -> dict:
        self.set_progress(1, 3, self.progress.MODEL_LOAD)
        model = self.load_model(self.params.model_id)

        self.set_progress(2, 3, self.progress.INFERENCE)
        predictions = self.infer(model, self.params.inputs)

        self.set_progress(3, 3, self.progress.POSTPROCESS)
        return {'predictions': predictions, 'count': len(predictions)}
```

### InferenceContext Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `runtime_ctx` | `RuntimeContext` | Parent context |
| `params` | `dict` | Action parameters |
| `model_id` | `int` | Model identifier |
| `model` | `Any` | Loaded model object |
| `requests` | `list` | Inference requests |
| `results` | `list` | Inference results |
| `processed_count` | `int` | Items processed |

---

## BaseDeploymentAction

For deploying inference endpoints to Ray Serve.

### Class Definition

```python
class BaseDeploymentAction(BaseAction[P]):
    progress = DeploymentProgressCategories()
    entrypoint: type | None = None  # Set to your serve class
```

### Key Methods

#### ray_init(**kwargs)

Initialize Ray cluster connection.

```python
self.ray_init()  # Connects to Ray cluster
```

#### deploy()

Deploy the entrypoint class to Ray Serve.

```python
self.deploy()  # Creates serve deployment
```

#### register_serve_application()

Register deployment with backend.

```python
app_id = self.register_serve_application()
```

### Simple Execute Example

```python
from pydantic import BaseModel
from ray import serve
from synapse_sdk.plugins.actions.inference import BaseDeploymentAction

class DeployParams(BaseModel):
    model_id: int
    num_gpus: float = 1.0

@serve.deployment
class MyServeDeployment:
    def __init__(self, backend_url: str):
        self.backend_url = backend_url
        # Load model here

    async def __call__(self, request):
        data = await request.json()
        # Run inference
        return {'result': 'prediction'}

class MyDeploymentAction(BaseDeploymentAction[DeployParams]):
    action_name = 'deployment'
    entrypoint = MyServeDeployment

    def execute(self) -> dict:
        self.ray_init()
        self.set_progress(1, 3, self.progress.INITIALIZE)

        self.deploy()
        self.set_progress(2, 3, self.progress.DEPLOY)

        app_id = self.register_serve_application()
        self.set_progress(3, 3, self.progress.REGISTER)

        return {'serve_application': app_id}
```

### Configuration Methods

Override these to customize deployment:

```python
class MyDeploymentAction(BaseDeploymentAction[DeployParams]):
    def get_serve_app_name(self) -> str:
        # Default: {plugin_code}@{version} or SYNAPSE_PLUGIN_RELEASE_CODE
        return 'my-custom-app-name'

    def get_route_prefix(self) -> str:
        # Default: MD5 hash of app name
        return '/my-custom-route'

    def get_ray_actor_options(self) -> dict:
        # Default: extracts num_cpus, num_gpus from params
        return {
            'num_gpus': 1,
            'runtime_env': self.get_runtime_env(),
        }

    def get_runtime_env(self) -> dict:
        # Default: reads requirements.txt
        return {'uv': {'packages': ['ultralytics']}}
```

### DeploymentContext Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `runtime_ctx` | `RuntimeContext` | Parent context |
| `params` | `dict` | Action parameters |
| `model_id` | `int` | Model identifier |
| `serve_app_name` | `str` | Serve application name |
| `route_prefix` | `str` | Route prefix |
| `ray_actor_options` | `dict` | Ray actor options |
| `serve_app_id` | `int` | Registered app ID |
| `deployed` | `bool` | Deployment status |

---

## Production Pitfall: Long Inference, the Event Loop, and Concurrency

A `serve` deployment runs as a Ray Serve replica behind an asyncio event loop (the FastAPI ingress). The single most common way to make a serve plugin fail under real traffic is to do **heavy, blocking work directly in the async `infer` handler**. This bites hard with large models (e.g. a multi-GB Whisper / ASR checkpoint) and shows up as a confusing cascade — `"Failed to route request"`, `"Replica at capacity"`, `ReadTimeout`, `"Agent connection error"`, `"Max retries exceeded"` — none of which name the real cause.

There are two distinct traps. You need to handle both.

### Trap 1 — Blocking the event loop starves the replica

The replica's event loop must stay responsive to answer Ray Serve health checks and accept/route requests. Synchronous model loading (`from_pretrained`, `torch.load`) and inference (`pipeline(...)`, `model.generate(...)`) block the loop for the entire call — seconds to minutes. While blocked, the replica looks dead: health checks fail, the proxy can't route, and *other* in-flight requests (including their `FileField` downloads, which run during request validation on the same loop) stall to `ReadTimeout`. The work itself is fine — the starvation is what kills neighbours.

**Fix:** run blocking work in a worker thread so the loop stays free.

```python
@app.post('/')
async def infer(self, data: InferenceInput) -> dict:
    model = await self.get_model()
    # offload the blocking transcription/prediction off the event loop
    return await asyncio.to_thread(self._run, model, data)
```

### Trap 2 — Rejecting requests triggers a client retry storm

The instinct after Trap 1 is to set `max_ongoing_requests: 1` so the GPU only does one thing at a time. **Don't.** When a request arrives and the replica is already at its limit, Ray Serve returns **503 "at capacity"**. The synapse-sdk backend client treats 503 as retryable (it's in the retry forcelist), so it immediately re-sends — and every retry hits the still-busy replica and is rejected again. The result is a retry storm where the caller exhausts its retries and returns **400** to the job, *even though the original request transcribes successfully and returns 200*. The successful 200 is orphaned; the dispatch layer already gave up.

**Fix:** keep `max_ongoing_requests` **high** so requests are *admitted* rather than rejected, and serialize the GPU yourself with a lock. Admitted requests then wait on the lock instead of bouncing off a 503.

```python
import asyncio, threading

_INFER_LOCK = threading.Lock()  # one model instance is not thread-safe; GPU is serial anyway

class MyServe(BaseServeDeployment):
    async def infer(self, data):
        model = await self.get_model()
        return await asyncio.to_thread(self._run, model, data)

    def _run(self, model, data):
        with _INFER_LOCK:          # serialize the actual generate() call
            return model.transcribe(data.audio_path)
```

```yaml
# config.yaml — deployment action
deployment:
  entrypoint: plugin.deployment.InferenceDeployment
  method: job
  serve_options:
    max_ongoing_requests: 32     # admit + queue; do NOT set to 1 (causes 503 retry storms)
    health_check_timeout_s: 180  # survive the one-time cold model-artifact download (multi-GB)
    health_check_period_s: 30
```

### Cold-start model download

`get_model()` (multiplexed loading) downloads and extracts the registered model artifact on the **first** request for a given `model_id`, then caches it. For a multi-GB model this is tens of seconds and currently runs synchronously inside the SDK's load path, briefly blocking the loop. Raising `health_check_timeout_s` keeps Ray Serve from declaring the replica dead during that window; after the first request the model is cached and subsequent calls skip it.

### Trap 3 — Inference longer than the synchronous dispatch timeout

`serve` inference is dispatched **synchronously**, and the call is held open across the whole chain: caller -> backend -> **agent** -> Ray Serve replica. The binding ceiling is the **backend->agent client read timeout, ~10s** (`AgentClient` default `{'connect':3,'read':10}`), with the ingress (~60s) and any CDN/Cloudflare (~100s) as further caps. A 10-30 minute transcription/diffusion cannot survive this no matter what you set — and a dropped connection loses all GPU work. Fast online models (sub-10s) are the only ones that fit synchronous serve.

> A common dead-end is raising the *caller's* `ctx.client.timeout['read']`. That's the **wrong leg** — it's the job->backend hop, not the backend->agent hop that actually severs long inference. Don't rely on it.

**The durable fix — deferred serve responses (`BaseServeDeployment.handle_inference`).** Wrap your root serve route so work runs in the background and the call returns within a short deadline:

```python
from fastapi import Request

@app.post('/')
async def infer(self, request: Request):
    body = await request.json()
    # done within deadline -> bare result (unchanged); else -> {__synapse_deferred__, ticket}
    return await self.handle_inference(body, InferenceInput, self._run_inference)

async def _run_inference(self, data: InferenceInput):
    model = await self.get_model()
    transcript = await asyncio.to_thread(run_blocking_inference, model, data)
    return to_dm_v2(transcript)
```

- Fast path returns the **bare result** (byte-for-byte unchanged) — existing callers/plugins are unaffected; only work exceeding `serve_deadline_s` (default 8s, below the 10s ceiling) returns a poll ticket.
- The caller (`to_task`) auto-polls the same endpoint until the ticket resolves — no held connection. Backward compatible: a response without the `__synapse_deferred__` envelope is treated as the final result.
- Keep it opt-in with a `hasattr(self, 'handle_inference')` fallback so the plugin also runs on an older SDK (degrades to synchronous).
- **Offload `get_model()` too**, not just inference: a cold multi-GB model load runs synchronously inside the load path and *blocks the event loop*, so the deadline timer can't fire until the model is loaded — the first request still blocks. Wrap loading in `asyncio.to_thread` (or pre-warm) so deferral engages on cold start.
- **Single replica only.** The ticket store is in-memory per replica. If the replica restarts or scales >1, an in-flight poll returns `not_found` and that task fails. Don't redeploy/bounce the serve while a `to_task` run is mid-flight.

---

## Progress Categories

### InferenceProgressCategories

| Constant | Value |
|----------|-------|
| `MODEL_LOAD` | `'model_load'` |
| `INFERENCE` | `'inference'` |
| `POSTPROCESS` | `'postprocess'` |

### DeploymentProgressCategories

| Constant | Value |
|----------|-------|
| `INITIALIZE` | `'initialize'` |
| `DEPLOY` | `'deploy'` |
| `REGISTER` | `'register'` |
