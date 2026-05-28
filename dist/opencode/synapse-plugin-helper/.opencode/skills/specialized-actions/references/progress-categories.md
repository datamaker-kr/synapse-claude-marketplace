# Progress Categories

Each specialized action provides standard progress category constants for tracking multi-phase workflows.

## Usage

```python
self.set_progress(current, total, self.progress.CATEGORY_NAME)
```

## TrainProgressCategories

For `BaseTrainAction`:

```python
from synapse_sdk.plugins.actions.train.action import TrainProgressCategories
```

| Constant | Value | Description |
|----------|-------|-------------|
| `DATASET` | `'dataset'` | Data loading and preprocessing |
| `TRAIN` | `'train'` | Model training iterations |
| `MODEL_UPLOAD` | `'model_upload'` | Final model upload |

```python
class MyTrainAction(BaseTrainAction[Params]):
    def execute(self) -> dict:
        self.set_progress(1, 3, self.progress.DATASET)
        dataset = self.get_dataset()

        self.set_progress(2, 3, self.progress.TRAIN)
        model.train(data=dataset)

        self.set_progress(3, 3, self.progress.MODEL_UPLOAD)
        return self.create_model('./model')
```

## ExportProgressCategories

For `BaseExportAction`:

```python
from synapse_sdk.plugins.actions.export.action import ExportProgressCategories
```

| Constant | Value | Description |
|----------|-------|-------------|
| `DATASET_CONVERSION` | `'dataset_conversion'` | Data conversion and file generation |

```python
class MyExportAction(BaseExportAction[Params]):
    def execute(self) -> dict:
        results, count = self.get_filtered_results(self.params.filter)
        for i, item in enumerate(results):
            self.process(item)
            self.set_progress(i + 1, count, self.progress.DATASET_CONVERSION)
        return {'exported': count}
```

## InferenceProgressCategories

For `BaseInferenceAction`:

```python
from synapse_sdk.plugins.actions.inference.action import InferenceProgressCategories
```

| Constant | Value | Description |
|----------|-------|-------------|
| `MODEL_LOAD` | `'model_load'` | Model loading and initialization |
| `INFERENCE` | `'inference'` | Running inference on inputs |
| `POSTPROCESS` | `'postprocess'` | Post-processing results |

```python
class MyInferenceAction(BaseInferenceAction[Params]):
    def execute(self) -> dict:
        self.set_progress(1, 3, self.progress.MODEL_LOAD)
        model = self.load_model(self.params.model_id)

        self.set_progress(2, 3, self.progress.INFERENCE)
        results = self.infer(model, self.params.inputs)

        self.set_progress(3, 3, self.progress.POSTPROCESS)
        return {'results': results}
```

## DeploymentProgressCategories

For `BaseDeploymentAction`:

```python
from synapse_sdk.plugins.actions.inference.deployment import DeploymentProgressCategories
```

| Constant | Value | Description |
|----------|-------|-------------|
| `INITIALIZE` | `'initialize'` | Ray cluster initialization |
| `DEPLOY` | `'deploy'` | Deploying to Ray Serve |
| `REGISTER` | `'register'` | Registering with backend |

## AddTaskDataProgressCategories

For `AddTaskDataAction`:

```python
from synapse_sdk.plugins.actions.add_task_data import AddTaskDataProgressCategories
```

| Constant | Value | Description |
|----------|-------|-------------|
| `ANNOTATE_TASK_DATA` | `'annotate_task_data'` | Task annotation progress |

```python
class MyPreAnnotationAction(AddTaskDataAction):
    def _update_progress(self, current: int, total: int, success: int, failed: int) -> None:
        self.set_progress(current, total, self.progress.ANNOTATE_TASK_DATA)
        self.set_metrics(
            {'success': success, 'failed': failed},
            self.progress.ANNOTATE_TASK_DATA,
        )
```

## UploadProgressCategories (Deprecated)

For `BaseUploadAction`:

```python
from synapse_sdk.plugins.actions.upload.action import UploadProgressCategories
```

| Constant | Value | Description |
|----------|-------|-------------|
| `INITIALIZE` | `'initialize'` | Storage and path setup |
| `VALIDATE` | `'validate'` | File validation |
| `UPLOAD` | `'upload'` | File upload |
| `CLEANUP` | `'cleanup'` | Post-upload cleanup |

**Note**: These are deprecated. Step names are now automatically used as progress categories.

```python
# Deprecated
self.set_progress(1, 4, self.progress.INITIALIZE)

# Recommended - step name auto-used
ctx.set_progress(1, 10)  # Category = current step name
```

## Custom Categories

You can use any string as a category:

```python
self.set_progress(50, 100, 'custom_phase')
```

Categories are displayed in the UI to show which phase the workflow is in.
