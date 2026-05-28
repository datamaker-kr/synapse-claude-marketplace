# Step Contexts

Context classes for sharing state between workflow steps.

## Import

```python
from synapse_sdk.plugins.steps import BaseStepContext

# Specialized contexts
from synapse_sdk.plugins.actions.train import TrainContext
from synapse_sdk.plugins.actions.export import ExportContext
from synapse_sdk.plugins.actions.upload import UploadContext
from synapse_sdk.plugins.actions.inference import InferenceContext, DeploymentContext
```

---

## BaseStepContext

Abstract base class for step contexts.

```python
@dataclass
class BaseStepContext:
    runtime_ctx: RuntimeContext
    step_results: list[StepResult] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    current_step: str | None = field(default=None, init=False)

    def log(self, event: str, data: dict, file: str | None = None) -> None
    def set_progress(self, current: int, total: int, category: str | None = None) -> None
    def set_metrics(self, value: dict, category: str | None = None) -> None
```

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `runtime_ctx` | `RuntimeContext` | Parent runtime context |
| `step_results` | `list[StepResult]` | Results from each step |
| `errors` | `list[str]` | Accumulated errors |
| `current_step` | `str` | Current step name (set by Orchestrator) |

### Methods

#### log(event, data, file)

Log an event.

```python
ctx.log('upload_complete', {'count': 100}, '/path/to/file')
```

#### set_progress(current, total, category)

Set progress. Category defaults to current step name.

```python
ctx.set_progress(50, 100)  # Uses current_step as category
ctx.set_progress(50, 100, 'custom_phase')
```

#### set_metrics(value, category)

Set metrics. Category defaults to current step name.

```python
ctx.set_metrics({'accuracy': 0.95})  # Uses current_step as category
ctx.set_metrics({'loss': 0.05}, 'training')
```

---

## Creating Custom Contexts

Extend `BaseStepContext` to add workflow-specific state:

```python
from dataclasses import dataclass, field
from synapse_sdk.plugins.steps import BaseStepContext

@dataclass
class ImageProcessingContext(BaseStepContext):
    # Parameters (from action params)
    params: dict = field(default_factory=dict)

    # State populated by steps
    image_paths: list[str] = field(default_factory=list)
    processed_images: list = field(default_factory=list)
    output_path: str | None = None

    # Helper properties
    @property
    def total_images(self) -> int:
        return len(self.image_paths)
```

Usage in steps:

```python
class LoadImagesStep(BaseStep[ImageProcessingContext]):
    def execute(self, ctx: ImageProcessingContext) -> StepResult:
        ctx.image_paths = glob.glob(ctx.params['input_dir'] + '/*.jpg')
        return StepResult(success=True)

class ProcessImagesStep(BaseStep[ImageProcessingContext]):
    def execute(self, ctx: ImageProcessingContext) -> StepResult:
        for i, path in enumerate(ctx.image_paths):
            processed = process_image(path)
            ctx.processed_images.append(processed)
            ctx.set_progress(i + 1, ctx.total_images)
        return StepResult(success=True)
```

---

## Specialized Contexts

### TrainContext

```python
@dataclass
class TrainContext(BaseStepContext):
    params: dict = field(default_factory=dict)
    dataset: Any | None = None       # Loaded dataset
    model_path: str | None = None    # Trained model path
    model: dict | None = None        # Created model metadata

    @property
    def client(self) -> BackendClient
```

### ExportContext

```python
@dataclass
class ExportContext(BaseStepContext):
    params: dict = field(default_factory=dict)
    results: Any | None = None       # Fetched results
    total_count: int = 0             # Total items
    exported_count: int = 0          # Items exported
    output_path: str | None = None   # Export path

    @property
    def client(self) -> BackendClient
```

### UploadContext

```python
@dataclass
class UploadContext(BaseStepContext):
    params: dict = field(default_factory=dict)
    storage: Any | None = None       # Storage configuration
    source_files: list = field(default_factory=list)
    uploaded_files: list[str] = field(default_factory=list)
    data_units: list[dict] = field(default_factory=list)

    @property
    def client(self) -> BackendClient
```

### InferenceContext

```python
@dataclass
class InferenceContext(BaseStepContext):
    params: dict = field(default_factory=dict)
    model_id: int | None = None
    model: Any | None = None         # Loaded model
    requests: list = field(default_factory=list)
    results: list = field(default_factory=list)
    processed_count: int = 0

    @property
    def client(self) -> BackendClient
```

### DeploymentContext

```python
@dataclass
class DeploymentContext(BaseStepContext):
    params: dict = field(default_factory=dict)
    model_id: int | None = None
    serve_app_name: str | None = None
    route_prefix: str | None = None
    ray_actor_options: dict = field(default_factory=dict)
    serve_app_id: int | None = None
    deployed: bool = False

    @property
    def client(self) -> BackendClient

    @property
    def agent_client(self) -> AgentClient
```

---

## Best Practices

### 1. Use Type Hints

```python
class MyStep(BaseStep[MyContext]):  # Explicit context type
    def execute(self, ctx: MyContext) -> StepResult:
        ...
```

### 2. Keep Context Focused

```python
# Good - specific to workflow
@dataclass
class UploadContext(BaseStepContext):
    uploaded_files: list[str] = field(default_factory=list)

# Bad - too generic
@dataclass
class Context(BaseStepContext):
    data: Any = None  # What is this?
```

### 3. Use Properties for Computed Values

```python
@dataclass
class ProcessContext(BaseStepContext):
    items: list = field(default_factory=list)
    processed: list = field(default_factory=list)

    @property
    def remaining(self) -> int:
        return len(self.items) - len(self.processed)
```

### 4. Provide Client Accessors

```python
@dataclass
class MyContext(BaseStepContext):
    @property
    def client(self) -> BackendClient:
        if self.runtime_ctx.client is None:
            raise RuntimeError('No client in context')
        return self.runtime_ctx.client
```
