# ActionPipeline

Chain actions together with automatic schema validation.

## Import

```python
from synapse_sdk.plugins.pipelines import ActionPipeline, SchemaIncompatibleError
from synapse_sdk.plugins.pipelines.context import PipelineContext
```

---

## Overview

ActionPipeline chains actions like Unix pipes:

```
Download | Convert | Train | Export
```

Each action's result is merged into params for the next action.

---

## Creating a Pipeline

```python
from synapse_sdk.plugins.pipelines import ActionPipeline

# Define actions in sequence
pipeline = ActionPipeline([
    DownloadDatasetAction,
    ConvertDatasetAction,
    TrainAction,
])

print(pipeline)
# ActionPipeline(DownloadDatasetAction | ConvertDatasetAction | TrainAction)
```

### Constructor Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `actions` | `list[type[BaseAction]]` | Required | Ordered action classes |
| `validate_schemas` | `bool` | `True` | Validate compatibility at init |
| `strict` | `bool` | `False` | Raise on mismatch (vs warning) |

---

## Executing a Pipeline

### Local Execution

```python
from synapse_sdk.plugins.context import RuntimeContext

ctx = RuntimeContext()

result = pipeline.execute(
    params={'dataset_id': 123, 'target_format': 'yolo'},
    ctx=ctx,
)
```

### With Progress Callback

```python
def on_progress(current: int, total: int, action_name: str):
    print(f"[{current}/{total}] Running {action_name}")

result = pipeline.execute(
    params={'dataset_id': 123},
    ctx=ctx,
    progress_callback=on_progress,
)
# [0/3] Running DownloadDatasetAction
# [1/3] Running ConvertDatasetAction
# [2/3] Running TrainAction
```

---

## Schema Validation

### How Validation Works

Pipeline validates compatibility between adjacent actions:

1. **Type compatibility**: `output_type` → `input_type`
2. **Field compatibility**: `result_model` fields → `params_model` required fields

```python
# Action A produces:
class DownloadResult(BaseModel):
    dataset_path: str
    total_images: int

# Action B requires:
class ConvertParams(BaseModel):
    dataset_path: str      # ✅ Provided by DownloadResult
    target_format: str     # ⚠️ Must be in initial params
```

### Strict Mode

```python
# Strict: raises on incompatibility
pipeline = ActionPipeline([
    ActionA,
    ActionB,
], strict=True)  # Raises SchemaIncompatibleError

# Non-strict (default): logs warning
pipeline = ActionPipeline([
    ActionA,
    ActionB,
])  # Logs warning, continues
```

### Validate Initial Params

Check if initial params satisfy all required fields:

```python
missing = pipeline.validate_initial_params({
    'dataset_id': 123,
})

if missing:
    print(f"Missing fields: {missing}")
# ['ConvertDatasetAction.target_format']
```

---

## Remote Execution

### Submit for Async Execution

```python
from synapse_sdk.plugins.executors.ray import RayPipelineExecutor

executor = RayPipelineExecutor(
    ray_address='auto',
    pipeline_service_url='http://localhost:8100',
)

run_id = pipeline.submit(
    params={'dataset_id': 123, 'epochs': 100},
    executor=executor,
    name='my-training-run',
)

print(f"Submitted: {run_id}")
```

### Wait for Completion

```python
result = pipeline.wait(
    run_id=run_id,
    executor=executor,
    timeout_seconds=3600,
    poll_interval=5.0,
)
```

### Resume from Failure

```python
# Resume failed pipeline
new_run_id = pipeline.submit(
    params={'dataset_id': 123},
    executor=executor,
    resume_from=run_id,  # Skip completed actions
)
```

---

## PipelineContext

Shared working directory for all actions in a pipeline.

```python
from synapse_sdk.plugins.pipelines.context import PipelineContext

ctx = PipelineContext(pipeline_id='yolo-training')

# Directory structure:
ctx.work_dir        # /tmp/synapse_pipelines/yolo-training/abc123
ctx.datasets_dir    # .../datasets
ctx.models_dir      # .../models
ctx.artifacts_dir   # .../artifacts
ctx.logs_dir        # .../logs
ctx.checkpoints_dir # .../checkpoints

# Per-action directory
ctx.get_action_dir('train')  # .../actions/train

# Cleanup after completion
ctx.cleanup()
```

---

## Complete Example

```python
from pydantic import BaseModel
from synapse_sdk.plugins.action import BaseAction
from synapse_sdk.plugins.pipelines import ActionPipeline
from synapse_sdk.plugins.types import Dataset, YOLODataset, ModelWeights

# Step 1: Download Action
class DownloadParams(BaseModel):
    dataset_id: int

class DownloadResult(BaseModel):
    dataset_path: str

class DownloadAction(BaseAction[DownloadParams]):
    result_model = DownloadResult
    output_type = Dataset

    def execute(self) -> DownloadResult:
        path = download_dataset(self.params.dataset_id)
        return DownloadResult(dataset_path=str(path))

# Step 2: Convert Action
class ConvertParams(BaseModel):
    dataset_path: str
    target_format: str

class ConvertResult(BaseModel):
    yolo_dataset_path: str

class ConvertAction(BaseAction[ConvertParams]):
    result_model = ConvertResult
    input_type = Dataset
    output_type = YOLODataset

    def execute(self) -> ConvertResult:
        path = convert_to_yolo(self.params.dataset_path)
        return ConvertResult(yolo_dataset_path=str(path))

# Step 3: Train Action
class TrainParams(BaseModel):
    yolo_dataset_path: str
    epochs: int = 100

class TrainResult(BaseModel):
    model_path: str
    metrics: dict

class TrainAction(BaseAction[TrainParams]):
    result_model = TrainResult
    input_type = YOLODataset
    output_type = ModelWeights

    def execute(self) -> TrainResult:
        result = train_model(self.params.yolo_dataset_path, self.params.epochs)
        return TrainResult(model_path=result.path, metrics=result.metrics)

# Create and execute pipeline
pipeline = ActionPipeline([
    DownloadAction,
    ConvertAction,
    TrainAction,
])

result = pipeline.execute(
    params={
        'dataset_id': 123,
        'target_format': 'yolo',
        'epochs': 50,
    },
    ctx=RuntimeContext(),
)

print(f"Model saved to: {result.model_path}")
print(f"Metrics: {result.metrics}")
```

---

## Properties and Methods

### Pipeline Properties

| Property | Type | Description |
|----------|------|-------------|
| `actions` | `list[type[BaseAction]]` | List of action classes |
| `__len__()` | `int` | Number of actions |

### Pipeline Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `execute(params, ctx)` | `Any` | Execute locally |
| `submit(params, executor)` | `str` | Submit for remote execution |
| `wait(run_id, executor)` | `Any` | Wait for completion |
| `validate_initial_params(params)` | `list[str]` | Check for missing fields |

---

## Error Handling

```python
from synapse_sdk.plugins.pipelines import ActionPipeline, SchemaIncompatibleError

try:
    pipeline = ActionPipeline([
        IncompatibleAction1,
        IncompatibleAction2,
    ], strict=True)
except SchemaIncompatibleError as e:
    print(f"Schema error: {e}")

try:
    result = pipeline.execute(params, ctx)
except RuntimeError as e:
    print(f"Execution failed: {e}")
```
