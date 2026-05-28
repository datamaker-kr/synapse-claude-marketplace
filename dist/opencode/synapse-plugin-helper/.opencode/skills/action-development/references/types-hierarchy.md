# Semantic Type System

Type classes for declaring action input/output data types.

## Import

```python
from synapse_sdk.plugins.types import (
    DataType,
    Dataset, YOLODataset, COCODataset, DMDataset,
    Model, ModelWeights, ONNXModel, TensorRTModel,
    Result, TestResults, InferenceResults,
)
```

---

## Type Hierarchy

```
DataType (base)
├── Dataset
│   ├── DMDataset
│   │   ├── DMv1Dataset
│   │   └── DMv2Dataset
│   ├── YOLODataset
│   ├── COCODataset
│   └── PascalVOCDataset
├── Model
│   ├── ModelWeights
│   ├── ONNXModel
│   └── TensorRTModel
└── Result
    ├── TestResults
    └── InferenceResults
```

---

## DataType Base Class

All types inherit from `DataType`.

```python
class DataType:
    name: ClassVar[str] = 'data'           # Human-readable name
    format: ClassVar[str | None] = None    # Format identifier
    description: ClassVar[str] = ''        # Type description

    @classmethod
    def is_compatible_with(cls, other: type[DataType]) -> bool:
        """Check type compatibility (same class or subclass)."""
```

### Compatibility Rules

Types are compatible if:
- They are the same class
- One is a subclass of the other

```python
YOLODataset.is_compatible_with(Dataset)  # True (YOLODataset is-a Dataset)
Dataset.is_compatible_with(YOLODataset)  # True (bidirectional)
YOLODataset.is_compatible_with(Model)    # False (different branches)
```

---

## Dataset Types

| Type | name | format | Description |
|------|------|--------|-------------|
| `Dataset` | `dataset` | - | Generic dataset |
| `DMDataset` | `dm_dataset` | `dm` | Datamaker format |
| `DMv1Dataset` | `dm_v1_dataset` | `dm_v1` | Datamaker v1 |
| `DMv2Dataset` | `dm_v2_dataset` | `dm_v2` | Datamaker v2 |
| `YOLODataset` | `yolo_dataset` | `yolo` | YOLO format with dataset.yaml |
| `COCODataset` | `coco_dataset` | `coco` | COCO format |
| `PascalVOCDataset` | `pascal_voc_dataset` | `pascal` | Pascal VOC format |

---

## Model Types

| Type | name | format | Description |
|------|------|--------|-------------|
| `Model` | `model` | - | Generic model |
| `ModelWeights` | `model_weights` | `weights` | Trained weights |
| `ONNXModel` | `onnx_model` | `onnx` | ONNX format |
| `TensorRTModel` | `tensorrt_model` | `tensorrt` | TensorRT format |

---

## Result Types

| Type | name | format | Description |
|------|------|--------|-------------|
| `Result` | `result` | - | Generic result |
| `TestResults` | `test_results` | `metrics` | Evaluation metrics |
| `InferenceResults` | `inference_results` | `predictions` | Predictions |

---

## Using Types in Actions

### Declare Input/Output Types

```python
from synapse_sdk.plugins.types import YOLODataset, ModelWeights

class TrainAction(BaseTrainAction[TrainParams]):
    input_type = YOLODataset    # Expects YOLO dataset
    output_type = ModelWeights  # Produces model weights
```

### Pipeline Validation

Types are validated in ActionPipeline:

```python
from synapse_sdk.plugins.pipelines import ActionPipeline

# ✅ Compatible: YOLODataset → ModelWeights → ONNXModel
pipeline = ActionPipeline([
    ConvertAction,   # output: YOLODataset
    TrainAction,     # input: YOLODataset, output: ModelWeights
    ExportAction,    # input: ModelWeights, output: ONNXModel
])

# ❌ Incompatible: COCODataset ≠ YOLODataset
pipeline = ActionPipeline([
    ConvertToCOCO,   # output: COCODataset
    TrainYOLO,       # input: YOLODataset  ← Type mismatch!
], strict=True)
```

---

## Creating Custom Types

```python
from synapse_sdk.plugins.types import DataType, Dataset

class CustomDataset(Dataset):
    """Custom dataset format for proprietary data."""
    name = 'custom_dataset'
    format = 'custom_v1'
    description = 'My custom dataset format'

class SegmentationDataset(Dataset):
    """Dataset with segmentation masks."""
    name = 'segmentation_dataset'
    format = 'seg'
    description = 'Dataset with instance segmentation'
```

Usage:

```python
class CustomTrainAction(BaseTrainAction[CustomTrainParams]):
    input_type = CustomDataset
    output_type = ModelWeights

    def execute(self) -> TrainResult:
        # Custom training logic
        pass
```

---

## Best Practices

1. **Use specific types**: Prefer `YOLODataset` over `Dataset` for clarity
2. **Custom types for custom formats**: Create new types for proprietary formats
3. **Document format details**: Use `description` to explain format requirements
4. **Test compatibility**: Use `is_compatible_with()` to verify pipeline compatibility
