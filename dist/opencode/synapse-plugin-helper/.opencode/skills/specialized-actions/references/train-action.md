# BaseTrainAction

Training action base class with helper methods for common training workflows.

## Import

```python
from synapse_sdk.plugins.actions.train import BaseTrainAction, TrainContext
from synapse_sdk.plugins.actions.train.action import TrainProgressCategories
```

## Class Definition

```python
class BaseTrainAction(BaseAction[P]):
    category = PluginCategory.NEURAL_NET
    progress = TrainProgressCategories()
```

## Key Methods

### autolog(framework)

Enable automatic logging for ML frameworks. Call before creating model objects.

```python
def execute(self) -> dict:
    self.autolog('ultralytics')
    model = YOLO('yolov8n.pt')  # Callbacks auto-attached
    model.train(epochs=100)     # Metrics logged automatically
    return {'weights_path': str(model.best)}
```

**Supported frameworks**: `'ultralytics'`

### get_dataset()

Fetch training dataset from backend using `params.dataset_id`.

```python
def execute(self) -> dict:
    dataset = self.get_dataset()  # Uses self.params.dataset_id
    # dataset contains: id, name, data_collection, etc.
    return {'dataset_id': dataset['id']}
```

Override for custom sources:

```python
def get_dataset(self) -> dict:
    return download_from_s3(self.params.s3_path)
```

### create_model(path, **kwargs)

Upload trained model to backend.

```python
def execute(self) -> dict:
    # ... training ...
    model_info = self.create_model('./model', name='my-model')
    return {'model_id': model_info['id']}
```

### get_checkpoint()

Get checkpoint for transfer learning or resuming training.

```python
def execute(self) -> dict:
    checkpoint = self.get_checkpoint()
    if checkpoint:
        model_path = checkpoint['path']
        is_base = checkpoint['category'] == 'base'
    # ...
```

Returns dict with `path`, `category`, `id`, `name` or `None`.

## BaseTrainParams

Common parameter fields for training actions:

```python
from synapse_sdk.plugins.actions.train import BaseTrainParams

class MyTrainParams(BaseTrainParams):
    epochs: int = 100
    batch_size: int = 32
    # Inherited: checkpoint (model ID for resuming)
```

## Simple Execute Example

```python
from pydantic import BaseModel
from synapse_sdk.plugins.actions.train import BaseTrainAction

class TrainParams(BaseModel):
    dataset_id: int
    epochs: int = 100

class MyTrainAction(BaseTrainAction[TrainParams]):
    action_name = 'train'

    def execute(self) -> dict:
        self.autolog('ultralytics')

        # Load dataset
        dataset = self.get_dataset()
        self.set_progress(1, 3, self.progress.DATASET)

        # Train
        from ultralytics import YOLO
        model = YOLO('yolov8n.pt')
        model.train(data=dataset['path'], epochs=self.params.epochs)
        self.set_progress(2, 3, self.progress.TRAIN)

        # Upload
        result = self.create_model(str(model.best))
        self.set_progress(3, 3, self.progress.MODEL_UPLOAD)

        return {
            'model_id': result['id'],
            'weights_path': str(model.best),
        }
```

## Step-based Example

```python
from synapse_sdk.plugins.actions.train import BaseTrainAction, TrainContext
from synapse_sdk.plugins.steps import BaseStep, StepResult, StepRegistry

class LoadDatasetStep(BaseStep[TrainContext]):
    @property
    def name(self) -> str:
        return 'load_dataset'

    @property
    def progress_weight(self) -> float:
        return 0.2

    def execute(self, ctx: TrainContext) -> StepResult:
        ctx.dataset = ctx.client.get_data_collection(ctx.params['dataset_id'])
        return StepResult(success=True)

class TrainStep(BaseStep[TrainContext]):
    @property
    def name(self) -> str:
        return 'train'

    @property
    def progress_weight(self) -> float:
        return 0.6

    def execute(self, ctx: TrainContext) -> StepResult:
        from ultralytics import YOLO
        model = YOLO('yolov8n.pt')
        model.train(data=ctx.dataset['path'], epochs=ctx.params['epochs'])
        ctx.model_path = str(model.best)
        return StepResult(success=True)

class UploadModelStep(BaseStep[TrainContext]):
    @property
    def name(self) -> str:
        return 'upload_model'

    @property
    def progress_weight(self) -> float:
        return 0.2

    def execute(self, ctx: TrainContext) -> StepResult:
        ctx.model = ctx.client.create_model({'file': ctx.model_path})
        return StepResult(success=True)

class MyTrainAction(BaseTrainAction[TrainParams]):
    action_name = 'train'

    def setup_steps(self, registry: StepRegistry[TrainContext]) -> None:
        registry.register(LoadDatasetStep())
        registry.register(TrainStep())
        registry.register(UploadModelStep())
```

## TrainContext Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `runtime_ctx` | `RuntimeContext` | Parent context |
| `params` | `dict` | Action parameters |
| `dataset` | `Any` | Loaded dataset (set by step) |
| `model_path` | `str` | Trained model path (set by step) |
| `model` | `dict` | Created model metadata (set by step) |
| `client` | `BackendClient` | Backend client accessor |
