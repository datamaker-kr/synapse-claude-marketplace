# AddTaskDataAction

Pre-annotation action for annotating tasks using file-based or inference-based methods.

## Import

```python
from synapse_sdk.plugins.actions.add_task_data import (
    AddTaskDataAction,
    AddTaskDataContext,
    AddTaskDataParams,
    AddTaskDataResult,
    AddTaskDataMethod,
    AddTaskDataProgressCategories,
)
```

---

## Class Definition

```python
class AddTaskDataAction(BaseAction[AddTaskDataParams]):
    action_name = 'add_task_data'
    category = PluginCategory.PRE_ANNOTATION
    result_model = AddTaskDataResult
    progress = AddTaskDataProgressCategories()
```

---

## Parameters

### AddTaskDataParams

```python
class AddTaskDataParams(BaseModel):
    name: str                                    # Action name (required)
    description: str | None = None               # Optional description
    project: int                                 # Project ID (required)
    agent: int                                   # Agent ID (required)
    task_filters: dict[str, Any] = {}            # Task filter criteria
    method: AddTaskDataMethod = 'file'           # 'file' or 'inference'
    target_specification_name: str | None = None # File spec name (for file method)
    model: int | None = None                     # Model ID (for inference)
    pre_processor: int | None = None             # Pre-processor plugin (for inference)
    pre_processor_params: dict[str, Any] = {}    # Extra inference params
```

### AddTaskDataMethod

```python
class AddTaskDataMethod(StrEnum):
    FILE = 'file'           # Read annotations from file specifications
    INFERENCE = 'inference' # Generate annotations via pre-processor
```

---

## Key Methods

### convert_data_from_file() (Required Override)

Convert file-based data into task data payload.

```python
def convert_data_from_file(
    self,
    primary_file_url: str,
    primary_file_name: str | None,
    data_file_url: str,
    data_file_name: str | None,
    task_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Override this to convert file data to annotation format."""
    raise NotImplementedError
```

### convert_data_from_inference() (Required Override)

Convert inference output into task data payload.

```python
def convert_data_from_inference(
    self,
    inference_data: Any,
    task_data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Override this to convert inference output to annotation format."""
    raise NotImplementedError
```

### Inference dispatch is synchronous — long pre-processors need deferred responses

In `inference` mode the action calls the pre-processor's serve endpoint synchronously via the backend (`client.run_plugin(<code>, ...)`) and **blocks until the prediction returns**. The binding ceiling is the **backend->agent** client read timeout (~10s), not the caller's. A slow pre-processor (large STT/ASR or diffusion, cold multi-GB checkpoint, or minutes on long input) blows past it -> `ReadTimeout` / failed task even though the model is working.

Raising the caller's `ctx.client.timeout['read']` does **not** fix this — that's the job->backend leg, not the backend->agent leg that actually severs the call. The real fix is on the **serve side**: the pre-processor should use the deferred-response pattern (`BaseServeDeployment.handle_inference` — deadline -> poll ticket), and `to_task` automatically polls the ticket to completion. See `inference-action.md` "Trap 3". No caller change is needed; `to_task` resolves deferred envelopes transparently and treats a plain (non-envelope) response as the final result.

Also ensure the **per-processor data_type is supported** when you build the inference payload — `_build_json_payload` only maps `image` -> `image_path` out of the box; for audio/text models add the matching branch (e.g. `audio` -> `audio_path`) so the key matches the serve plugin's input field.

### Inference output tool must match the project's annotation schema

`convert_data_from_inference` runs `DMV2ToV1Converter().convert(...)`, but the converted v1 tool is then validated against the **target project's schema** on submit. A wrong tool fails the task with `'"<tool>"이 유효하지 않은 선택(choice)입니다'` (invalid choice) — *after* a successful inference. Pick the tool the project actually defines (inspect `GET /projects/<id>/` -> `configuration`), not just any converter-supported tool:

- **Audio transcription** is typically an audio **`segmentation`** tool (class e.g. `speech`, attribute `transcript`), *not* `classification`. DM v2 shape: `{"audios":[{"segmentation":[{id, classification:"speech", attrs:[{name:"transcript",value:...}], data:{start, end}}]}]}` where `data.start/end` are **seconds** -> v1 `section:{start,end}`.
- Emit **one annotation per timestamped segment**: Whisper's transformers pipeline with `return_timestamps=True` returns `chunks: [{'timestamp': (start, end), 'text'}]` — map each chunk to its own segment rather than one whole-clip blob. (A near-silent/non-speech region often yields a hallucinated `...` chunk — a Whisper artifact, not a pipeline bug.)

---

## Result Schema

### AddTaskDataResult

```python
class AddTaskDataResult(BaseModel):
    status: JobStatus           # SUCCEEDED, FAILED, etc.
    message: str                # Summary message
    total_tasks: int            # Total tasks processed
    success_count: int          # Successfully annotated
    failed_count: int           # Failed annotations
    failures: list[dict] = []   # Per-task failure details
```

---

## Progress Categories

```python
class AddTaskDataProgressCategories:
    ANNOTATE_TASK_DATA: str = 'annotate_task_data'
```

---

## Complete Example: File-Based Annotation

```python
from synapse_sdk.plugins.actions.add_task_data import (
    AddTaskDataAction,
    AddTaskDataParams,
    AddTaskDataResult,
)
import json
import requests

class MyFileAnnotationAction(AddTaskDataAction):
    """Annotate tasks from JSON annotation files."""

    def convert_data_from_file(
        self,
        primary_file_url: str,
        primary_file_name: str | None,
        data_file_url: str,
        data_file_name: str | None,
        task_data: dict | None = None,
    ) -> dict:
        # Download annotation file
        response = requests.get(data_file_url)
        annotations = response.json()

        # Convert to Datamaker annotation format
        return {
            'annotations': [
                {
                    'type': ann['type'],
                    'coordinates': ann['bbox'],
                    'label': ann['category'],
                }
                for ann in annotations.get('objects', [])
            ]
        }
```

## Complete Example: Inference-Based Annotation

```python
from synapse_sdk.plugins.actions.add_task_data import (
    AddTaskDataAction,
    AddTaskDataParams,
    AddTaskDataResult,
    AddTaskDataMethod,
)

class MyInferenceAnnotationAction(AddTaskDataAction):
    """Annotate tasks using model inference."""

    def convert_data_from_inference(
        self,
        inference_data: Any,
        task_data: dict | None = None,
    ) -> dict:
        # Convert inference output to annotation format
        predictions = inference_data.get('predictions', [])

        return {
            'annotations': [
                {
                    'type': 'bbox',
                    'coordinates': pred['box'],
                    'label': pred['class_name'],
                    'confidence': pred['score'],
                }
                for pred in predictions
                if pred['score'] > 0.5
            ]
        }
```

## Usage in config.yaml

```yaml
name: my-pre-annotation
code: my-pre-annotation
version: 1.0.0
category: pre_annotation

actions:
  add_task_data:
    entrypoint: plugin.action:MyFileAnnotationAction
    method: task
    description: Pre-annotate tasks from JSON files
```

---

## Workflow

1. **Load Data Collection**: Fetches project and data collection metadata
2. **Validate Configuration**: Checks method-specific requirements
3. **Iterate Tasks**: Processes each task matching filters
4. **Convert Data**: Calls `convert_data_from_file()` or `convert_data_from_inference()`
5. **Submit Annotations**: Sends converted data to backend
6. **Report Results**: Returns success/failure counts

---

## Context: AddTaskDataContext

Shared state between steps in the workflow.

```python
@dataclass
class AddTaskDataContext(BaseStepContext):
    params: dict[str, Any] = field(default_factory=dict)
    data_collection: dict[str, Any] | None = None
    task_ids: list[int] = field(default_factory=list)
    inference: dict[str, Any] | None = None  # {code, version}
    failures: list[dict[str, Any]] = field(default_factory=list)
    success_count: int = 0
    failed_count: int = 0

    @property
    def total_tasks(self) -> int:
        return len(self.task_ids)
```

| Attribute | Type | Description |
|-----------|------|-------------|
| `params` | `dict` | Flattened action parameters |
| `data_collection` | `dict` | Project data collection metadata |
| `task_ids` | `list[int]` | Task IDs to annotate |
| `inference` | `dict` | Inference context (code, version) |
| `failures` | `list[dict]` | Per-task failure records |
| `success_count` | `int` | Successfully processed tasks |
| `failed_count` | `int` | Failed tasks |
