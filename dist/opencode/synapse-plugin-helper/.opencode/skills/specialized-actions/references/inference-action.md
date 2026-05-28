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
