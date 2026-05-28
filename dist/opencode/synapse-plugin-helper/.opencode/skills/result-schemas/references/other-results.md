# Other Result Schemas

Result schemas for export, upload, and metrics actions.

## Import

```python
from synapse_sdk.plugins.schemas import (
    ExportResult,
    UploadResult,
    MetricsResult,
)
```

---

## ExportResult

Result type for data export actions.

```python
class ExportResult(BaseModel):
    output_path: str
    exported_count: int
    format: str
    file_size_bytes: int | None = None
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `output_path` | `str` | Yes | Path to exported file/directory |
| `exported_count` | `int` | Yes | Number of items exported |
| `format` | `str` | Yes | Export format (coco, yolo, voc, csv) |
| `file_size_bytes` | `int` | No | Size of exported file |

### Example Usage

```python
from synapse_sdk.plugins.actions.export import BaseExportAction
from synapse_sdk.plugins.schemas import ExportResult
import os

class MyExportAction(BaseExportAction[ExportParams]):
    result_model = ExportResult

    def execute(self) -> ExportResult:
        results, count = self.get_filtered_results(self.params.filter)

        output_path = f'/exports/dataset_{self.params.project_id}.zip'

        for item in results:
            self.export_item(item, output_path)

        file_size = os.path.getsize(output_path)

        return ExportResult(
            output_path=output_path,
            exported_count=count,
            format=self.params.format,
            file_size_bytes=file_size,
        )
```

---

## UploadResult

Result type for file upload actions.

```python
class UploadResult(BaseModel):
    uploaded_count: int
    remote_path: str | None = None
    status: str = 'completed'
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uploaded_count` | `int` | Yes | Number of items uploaded |
| `remote_path` | `str` | No | Remote URL or path |
| `status` | `str` | No | Upload status (default: 'completed') |

### Example Usage

```python
from synapse_sdk.plugins.actions.upload import BaseUploadAction
from synapse_sdk.plugins.schemas import UploadResult

class MyUploadAction(BaseUploadAction[UploadParams]):
    result_model = UploadResult

    def setup_steps(self, registry: StepRegistry[UploadContext]) -> None:
        registry.register(InitializeStep())
        registry.register(UploadFilesStep())
        registry.register(FinalizeStep())

    # execute() returns result automatically from context
    # To customize, override create_context() or post-process
```

### Manual Result

```python
return UploadResult(
    uploaded_count=500,
    remote_path='s3://my-bucket/datasets/v1/',
    status='completed',
)
```

### With Partial Status

```python
return UploadResult(
    uploaded_count=450,
    remote_path='s3://my-bucket/datasets/v1/',
    status='partial',  # Some files failed
)
```

---

## MetricsResult

Result type for evaluation/testing actions that only output metrics.

```python
class MetricsResult(BaseModel):
    metrics: dict[str, float]
    category: str = 'default'
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `metrics` | `dict[str, float]` | Yes | Metric name to value mapping |
| `category` | `str` | No | Metrics category (train, val, test) |

### Example Usage

```python
from synapse_sdk.plugins.action import BaseAction
from synapse_sdk.plugins.schemas import MetricsResult

class EvaluateAction(BaseAction[EvalParams]):
    result_model = MetricsResult

    def execute(self) -> MetricsResult:
        model = self.load_model(self.params.model_id)
        dataset = self.load_dataset(self.params.dataset_id)

        metrics = model.val(data=dataset)

        return MetricsResult(
            metrics={
                'mAP50': metrics.box.map50,
                'mAP50-95': metrics.box.map,
                'precision': metrics.box.mp,
                'recall': metrics.box.mr,
            },
            category='validation',
        )
```

### Multiple Categories

```python
# For train metrics
train_result = MetricsResult(
    metrics={'loss': 0.05, 'accuracy': 0.95},
    category='train',
)

# For validation metrics
val_result = MetricsResult(
    metrics={'loss': 0.08, 'accuracy': 0.92},
    category='validation',
)

# For test metrics
test_result = MetricsResult(
    metrics={'loss': 0.10, 'accuracy': 0.90},
    category='test',
)
```

---

## Custom Result Schemas

Create custom schemas for specific needs:

```python
from pydantic import BaseModel, Field

class DatasetExportResult(BaseModel):
    """Custom result for dataset export."""
    output_path: str
    format: str

    # Dataset stats
    image_count: int
    annotation_count: int
    class_distribution: dict[str, int]

    # Export metadata
    export_time_seconds: float
    compression_ratio: float | None = None

class MyExportAction(BaseExportAction[ExportParams]):
    result_model = DatasetExportResult

    def execute(self) -> DatasetExportResult:
        # ... export logic ...
        return DatasetExportResult(
            output_path='/exports/dataset.zip',
            format='coco',
            image_count=1000,
            annotation_count=5000,
            class_distribution={'person': 3000, 'car': 2000},
            export_time_seconds=45.5,
            compression_ratio=0.7,
        )
```

---

## Result Validation

When `result_model` is set, the SDK validates the return value:

```python
class MyAction(BaseAction[Params]):
    result_model = TrainResult

    def execute(self):
        # This will raise ValidationError
        return {'invalid': 'dict'}

        # This works
        return TrainResult(weights_path='/model.pt', final_epoch=100)
```

Validation errors include helpful messages:

```
ValidationError: 1 validation error for TrainResult
weights_path
  Field required [type=missing, ...]
```
