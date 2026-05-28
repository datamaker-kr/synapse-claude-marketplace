# Training Result Schemas

Result schemas for training and model weight outputs.

## Import

```python
from synapse_sdk.plugins.schemas import TrainResult, WeightsResult
```

---

## TrainResult

Combined result type for training actions with weights and metrics.

```python
class TrainResult(BaseModel):
    weights_path: str
    final_epoch: int
    best_epoch: int | None = None
    train_metrics: dict[str, float] = {}
    val_metrics: dict[str, float] = {}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `weights_path` | `str` | Yes | Path to trained model weights |
| `final_epoch` | `int` | Yes | Last completed epoch |
| `best_epoch` | `int` | No | Best epoch by validation metric |
| `train_metrics` | `dict` | No | Final training metrics |
| `val_metrics` | `dict` | No | Final validation metrics |

### Example Usage

```python
from synapse_sdk.plugins.actions.train import BaseTrainAction
from synapse_sdk.plugins.schemas import TrainResult

class MyTrainAction(BaseTrainAction[TrainParams]):
    result_model = TrainResult

    def execute(self) -> TrainResult:
        self.autolog('ultralytics')

        from ultralytics import YOLO
        model = YOLO('yolov8n.pt')
        results = model.train(
            data=self.params.data_path,
            epochs=self.params.epochs,
        )

        return TrainResult(
            weights_path=str(model.best),
            final_epoch=self.params.epochs,
            best_epoch=results.best_epoch,
            train_metrics={
                'loss': results.results_dict['train/box_loss'],
            },
            val_metrics={
                'mAP50': results.results_dict['metrics/mAP50(B)'],
                'mAP50-95': results.results_dict['metrics/mAP50-95(B)'],
            },
        )
```

### With Function-Based Action

```python
from synapse_sdk.plugins.decorators import action
from synapse_sdk.plugins.schemas import TrainResult

@action(name='train', result=TrainResult)
def train(params: TrainParams, ctx: RuntimeContext) -> TrainResult:
    # ... training logic ...
    return TrainResult(
        weights_path='/models/best.pt',
        final_epoch=100,
        train_metrics={'loss': 0.05},
        val_metrics={'accuracy': 0.95},
    )
```

---

## WeightsResult

Lightweight result for actions that only produce model weights.

```python
class WeightsResult(BaseModel):
    weights_path: str
    checkpoint_paths: list[str] = []
    format: str = 'pt'
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `weights_path` | `str` | Yes | Path to best/final weights |
| `checkpoint_paths` | `list` | No | Intermediate checkpoint paths |
| `format` | `str` | No | Weights format (pt, onnx, safetensors) |

### Example Usage

```python
from synapse_sdk.plugins.action import BaseAction
from synapse_sdk.plugins.schemas import WeightsResult

class ConvertModelAction(BaseAction[ConvertParams]):
    result_model = WeightsResult

    def execute(self) -> WeightsResult:
        # Convert model to ONNX
        output_path = convert_to_onnx(self.params.model_path)

        return WeightsResult(
            weights_path=output_path,
            format='onnx',
        )
```

### With Checkpoints

```python
return WeightsResult(
    weights_path='/models/best.pt',
    checkpoint_paths=[
        '/models/epoch_10.pt',
        '/models/epoch_50.pt',
        '/models/epoch_100.pt',
    ],
    format='pt',
)
```

---

## Custom Training Results

Extend the base schemas for custom fields:

```python
from pydantic import BaseModel, Field
from synapse_sdk.plugins.schemas import TrainResult

class YOLOTrainResult(TrainResult):
    """Extended result for YOLO training."""
    box_loss: float = Field(description='Box loss')
    cls_loss: float = Field(description='Classification loss')
    dfl_loss: float = Field(description='DFL loss')

class MyTrainAction(BaseTrainAction[TrainParams]):
    result_model = YOLOTrainResult

    def execute(self) -> YOLOTrainResult:
        # ... training ...
        return YOLOTrainResult(
            weights_path='/models/best.pt',
            final_epoch=100,
            box_loss=0.05,
            cls_loss=0.02,
            dfl_loss=0.01,
        )
```
