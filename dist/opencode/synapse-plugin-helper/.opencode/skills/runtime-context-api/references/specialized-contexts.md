# Specialized Step Contexts

Context classes for step-based workflows that extend `BaseStepContext`.

## Context Hierarchy

```
RuntimeContext (action-level)
    └── BaseStepContext (step-level base)
            ├── TrainContext
            ├── ExportContext
            ├── UploadContext
            ├── InferenceContext
            ├── DeploymentContext
            └── AddTaskDataContext
```

## BaseStepContext

Base class for all step contexts.

```python
from synapse_sdk.plugins.steps import BaseStepContext

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

### Auto-Category Feature

When `category` is not provided, the current step name is used:

```python
class ProcessStep(BaseStep[MyContext]):
    @property
    def name(self) -> str:
        return 'process_data'

    def execute(self, ctx: MyContext) -> StepResult:
        ctx.set_progress(50, 100)  # category = 'process_data'
        ctx.set_metrics({'items': 100})  # category = 'process_data'
```

---

## TrainContext

For training workflows.

```python
from synapse_sdk.plugins.actions.train import TrainContext
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `params` | `dict` | Training parameters |
| `dataset` | `Any` | Loaded dataset |
| `model_path` | `str` | Trained model path |
| `model` | `dict` | Created model metadata |
| `client` | `BackendClient` | Backend client |

### Example

```python
class LoadDatasetStep(BaseStep[TrainContext]):
    def execute(self, ctx: TrainContext) -> StepResult:
        ctx.dataset = ctx.client.get_data_collection(ctx.params['dataset_id'])
        return StepResult(success=True)

class TrainStep(BaseStep[TrainContext]):
    def execute(self, ctx: TrainContext) -> StepResult:
        model = train(ctx.dataset, epochs=ctx.params['epochs'])
        ctx.model_path = str(model.best)
        return StepResult(success=True)
```

---

## ExportContext

For export workflows.

```python
from synapse_sdk.plugins.actions.export import ExportContext
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `params` | `dict` | Export parameters |
| `results` | `Any` | Fetched results |
| `total_count` | `int` | Total items |
| `exported_count` | `int` | Items exported |
| `output_path` | `str` | Export path |
| `client` | `BackendClient` | Backend client |

---

## UploadContext

For upload workflows.

```python
from synapse_sdk.plugins.actions.upload import UploadContext
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `params` | `dict` | Upload parameters |
| `storage` | `Any` | Storage config |
| `source_files` | `list` | Files to upload |
| `uploaded_files` | `list[str]` | Uploaded paths |
| `data_units` | `list[dict]` | Created data units |
| `client` | `BackendClient` | Backend client |

---

## InferenceContext

For inference workflows.

```python
from synapse_sdk.plugins.actions.inference import InferenceContext
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `params` | `dict` | Inference parameters |
| `model_id` | `int` | Model identifier |
| `model` | `Any` | Loaded model |
| `requests` | `list` | Inference requests |
| `results` | `list` | Inference results |
| `processed_count` | `int` | Items processed |
| `client` | `BackendClient` | Backend client |

---

## DeploymentContext

For Ray Serve deployment workflows.

```python
from synapse_sdk.plugins.actions.inference import DeploymentContext
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `params` | `dict` | Deployment parameters |
| `model_id` | `int` | Model identifier |
| `serve_app_name` | `str` | Serve app name |
| `route_prefix` | `str` | Route prefix |
| `ray_actor_options` | `dict` | Actor options |
| `serve_app_id` | `int` | Registered app ID |
| `deployed` | `bool` | Deployment status |
| `client` | `BackendClient` | Backend client |
| `agent_client` | `AgentClient` | Agent client |

---

## AddTaskDataContext

For pre-annotation workflows.

```python
from synapse_sdk.plugins.actions.add_task_data import AddTaskDataContext
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `params` | `dict` | Action parameters |
| `data_collection` | `dict` | Project data collection metadata |
| `task_ids` | `list[int]` | Task IDs to annotate |
| `inference` | `dict` | Inference context (code, version) |
| `failures` | `list[dict]` | Per-task failure records |
| `success_count` | `int` | Successfully processed tasks |
| `failed_count` | `int` | Failed tasks |

### Properties

```python
@property
def total_tasks(self) -> int:
    """Total discovered tasks."""
    return len(self.task_ids)
```

### Example

```python
class AnnotateStep(BaseStep[AddTaskDataContext]):
    def execute(self, ctx: AddTaskDataContext) -> StepResult:
        for task_id in ctx.task_ids:
            try:
                # Process task
                ctx.success_count += 1
            except Exception as e:
                ctx.failed_count += 1
                ctx.failures.append({'task_id': task_id, 'error': str(e)})

        return StepResult(success=True)
```

---

## Creating Custom Contexts

Extend `BaseStepContext` for custom workflows:

```python
from dataclasses import dataclass, field
from synapse_sdk.plugins.steps import BaseStepContext

@dataclass
class VideoProcessingContext(BaseStepContext):
    # Parameters
    params: dict = field(default_factory=dict)

    # Processing state
    video_paths: list[str] = field(default_factory=list)
    frames_extracted: int = 0
    processed_frames: list = field(default_factory=list)
    output_video: str | None = None

    @property
    def total_frames(self) -> int:
        return len(self.video_paths) * self.params.get('frames_per_video', 30)

    @property
    def client(self) -> BackendClient:
        if self.runtime_ctx.client is None:
            raise RuntimeError('No client in context')
        return self.runtime_ctx.client
```

Usage:

```python
class ExtractFramesStep(BaseStep[VideoProcessingContext]):
    def execute(self, ctx: VideoProcessingContext) -> StepResult:
        for video in ctx.video_paths:
            frames = extract_frames(video)
            ctx.frames_extracted += len(frames)
            ctx.set_progress(ctx.frames_extracted, ctx.total_frames)
        return StepResult(success=True)
```
