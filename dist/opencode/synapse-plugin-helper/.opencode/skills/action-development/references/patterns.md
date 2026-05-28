# Action Development Patterns

## Parameter Validation with Pydantic

### Field Constraints

```python
from pydantic import BaseModel, Field, field_validator

class TrainParams(BaseModel):
    epochs: int = Field(ge=1, le=1000, description='Number of training epochs')
    batch_size: int = Field(default=32, ge=1, le=512)
    learning_rate: float = Field(default=0.001, gt=0, lt=1)
    model_name: str = Field(pattern=r'^[a-z][a-z0-9_]*$')

    @field_validator('model_name')
    @classmethod
    def validate_model_name(cls, v: str) -> str:
        if len(v) > 50:
            raise ValueError('Model name too long')
        return v
```

### Optional Fields

```python
class ExportParams(BaseModel):
    format: str = 'yolo'
    include_images: bool = True
    output_dir: str | None = None  # Optional, can be None
```

## Result Schema Validation

```python
class TrainResult(BaseModel):
    weights_path: str
    final_loss: float
    epochs_trained: int

@action(params=TrainParams, result=TrainResult)
def train(params: TrainParams, ctx: RuntimeContext) -> TrainResult:
    # Training logic
    return TrainResult(
        weights_path='/model.pt',
        final_loss=0.05,
        epochs_trained=params.epochs
    )
```

## Semantic Types for Pipelines

Declare input/output types for pipeline compatibility:

```python
from synapse_sdk.plugins.types import YOLODataset, ModelWeights

class TrainAction(BaseAction[TrainParams]):
    input_type = YOLODataset
    output_type = ModelWeights
    result_model = TrainResult

    def execute(self) -> TrainResult:
        # Training implementation
        return TrainResult(weights_path='/model.pt', final_loss=0.1)
```

## Helper Methods in Class-Based Actions

```python
class InferAction(BaseAction[InferParams]):
    action_name = 'inference'

    def execute(self) -> dict:
        self.set_progress(0, 100)
        model = self._load_model()
        results = self._run_inference(model)
        self.set_progress(100, 100)
        return {'predictions': results}

    def _load_model(self):
        """Helper method for loading model"""
        return load_model(self.params.model_path)

    def _run_inference(self, model):
        """Helper method for inference"""
        return model.predict(threshold=self.params.threshold)
```

## Progress Tracking with Categories

```python
def execute(self) -> dict:
    # Download phase
    self.set_progress(0, 100, category='download')
    # ... download logic
    self.set_progress(100, 100, category='download')

    # Training phase
    for epoch in range(self.params.epochs):
        self.set_progress(epoch, self.params.epochs, category='training')
        # ... train logic

    return {'status': 'completed'}
```

## Metrics Recording

```python
def execute(self) -> dict:
    # Record training metrics
    self.set_metrics({
        'loss': 0.05,
        'accuracy': 0.95,
        'learning_rate': self.params.learning_rate
    }, category='training')

    return {'status': 'completed'}
```
