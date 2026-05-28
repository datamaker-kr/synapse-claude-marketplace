# Inference Result Schema

Result schema for inference and prediction actions.

## Import

```python
from synapse_sdk.plugins.schemas import InferenceResult
```

---

## InferenceResult

Generic container for inference outputs.

```python
class InferenceResult(BaseModel):
    predictions: list[dict[str, Any]] = []
    processed_count: int = 0
    output_path: str | None = None
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `predictions` | `list[dict]` | No | List of prediction results |
| `processed_count` | `int` | No | Number of items processed |
| `output_path` | `str` | No | Path to output file if saved |

### Example Usage

```python
from synapse_sdk.plugins.actions.inference import BaseInferenceAction
from synapse_sdk.plugins.schemas import InferenceResult

class MyInferenceAction(BaseInferenceAction[InferenceParams]):
    result_model = InferenceResult

    def infer(self, model, inputs: list[dict]) -> list[dict]:
        results = []
        for inp in inputs:
            pred = model.predict(inp['image'])
            results.append({
                'image_id': inp['id'],
                'boxes': pred.boxes.data.tolist(),
                'scores': pred.boxes.conf.tolist(),
                'classes': pred.boxes.cls.tolist(),
            })
        return results

    def execute(self) -> InferenceResult:
        model = self.load_model(self.params.model_id)
        predictions = self.infer(model, self.params.inputs)

        return InferenceResult(
            predictions=predictions,
            processed_count=len(predictions),
        )
```

### With Output File

```python
def execute(self) -> InferenceResult:
    model = self.load_model(self.params.model_id)
    predictions = self.infer(model, self.params.inputs)

    # Save predictions to file
    output_path = '/outputs/predictions.json'
    with open(output_path, 'w') as f:
        json.dump(predictions, f)

    return InferenceResult(
        predictions=predictions,
        processed_count=len(predictions),
        output_path=output_path,
    )
```

### With Function-Based Action

```python
from synapse_sdk.plugins.decorators import action
from synapse_sdk.plugins.schemas import InferenceResult

@action(name='predict', result=InferenceResult)
def predict(params: PredictParams, ctx: RuntimeContext) -> InferenceResult:
    model = load_model(params.model_id)

    predictions = []
    for image_path in params.image_paths:
        result = model.predict(image_path)
        predictions.append({
            'path': image_path,
            'class': result.class_name,
            'confidence': result.confidence,
        })

    return InferenceResult(
        predictions=predictions,
        processed_count=len(predictions),
    )
```

---

## Custom Inference Results

Extend for domain-specific predictions:

```python
from pydantic import BaseModel, Field
from synapse_sdk.plugins.schemas import InferenceResult

class DetectionResult(BaseModel):
    """Single detection result."""
    image_id: str
    boxes: list[list[float]]
    scores: list[float]
    classes: list[int]
    class_names: list[str]

class ObjectDetectionResult(InferenceResult):
    """Extended result for object detection."""
    predictions: list[DetectionResult] = []
    average_confidence: float = Field(default=0.0)
    detection_count: int = Field(default=0)

class MyDetectionAction(BaseInferenceAction[DetectionParams]):
    result_model = ObjectDetectionResult

    def execute(self) -> ObjectDetectionResult:
        # ... inference logic ...
        return ObjectDetectionResult(
            predictions=detections,
            processed_count=len(images),
            average_confidence=avg_conf,
            detection_count=total_detections,
        )
```

### Segmentation Result

```python
class SegmentationResult(InferenceResult):
    """Result for segmentation tasks."""
    masks: list[str] = Field(default_factory=list, description='Mask file paths')
    iou_scores: list[float] = Field(default_factory=list)
    mask_format: str = Field(default='png')
```

### Classification Result

```python
class ClassificationResult(InferenceResult):
    """Result for classification tasks."""
    top_k: int = Field(default=5)
    class_names: list[str] = Field(default_factory=list)
    probabilities: list[list[float]] = Field(default_factory=list)
```
