# BaseUploadAction

Upload action base class with mandatory step-based workflow.

## Import

```python
from synapse_sdk.plugins.actions.upload import BaseUploadAction, UploadContext
from synapse_sdk.plugins.actions.upload.action import UploadProgressCategories
```

## Class Definition

```python
class BaseUploadAction(BaseAction[P]):
    category = PluginCategory.UPLOAD
    progress = UploadProgressCategories()  # deprecated
```

## Step-based Workflow Required

Unlike other specialized actions, `BaseUploadAction` **requires** step-based workflow. Override `setup_steps()` to register your workflow steps.

```python
class MyUploadAction(BaseUploadAction[UploadParams]):
    action_name = 'upload'

    def setup_steps(self, registry: StepRegistry[UploadContext]) -> None:
        registry.register(InitializeStep())
        registry.register(ValidateStep())
        registry.register(UploadFilesStep())
        registry.register(CleanupStep())
```

If no steps are registered, `execute()` raises `RuntimeError`.

## Complete Example

```python
from pathlib import Path
from pydantic import BaseModel
from synapse_sdk.plugins.actions.upload import BaseUploadAction, UploadContext
from synapse_sdk.plugins.steps import BaseStep, StepResult, StepRegistry

class UploadParams(BaseModel):
    source_path: str
    storage_id: int
    validate: bool = True

# Step 1: Initialize
class InitializeStep(BaseStep[UploadContext]):
    @property
    def name(self) -> str:
        return 'initialize'

    @property
    def progress_weight(self) -> float:
        return 0.1

    def execute(self, ctx: UploadContext) -> StepResult:
        ctx.storage = ctx.client.get_storage(ctx.params['storage_id'])
        ctx.source_files = list(Path(ctx.params['source_path']).glob('*'))
        return StepResult(success=True)

# Step 2: Validate
class ValidateStep(BaseStep[UploadContext]):
    @property
    def name(self) -> str:
        return 'validate'

    @property
    def progress_weight(self) -> float:
        return 0.1

    def can_skip(self, ctx: UploadContext) -> bool:
        return not ctx.params.get('validate', True)

    def execute(self, ctx: UploadContext) -> StepResult:
        invalid_files = []
        for file in ctx.source_files:
            if not self.validate_file(file):
                invalid_files.append(str(file))

        if invalid_files:
            return StepResult(
                success=False,
                error=f"Invalid files: {invalid_files}"
            )
        return StepResult(success=True)

# Step 3: Upload
class UploadFilesStep(BaseStep[UploadContext]):
    @property
    def name(self) -> str:
        return 'upload'

    @property
    def progress_weight(self) -> float:
        return 0.7

    def execute(self, ctx: UploadContext) -> StepResult:
        total = len(ctx.source_files)
        for i, file in enumerate(ctx.source_files):
            remote_path = ctx.storage.upload(file)
            ctx.uploaded_files.append(remote_path)
            ctx.set_progress(i + 1, total)
        return StepResult(success=True, data={'count': total})

    def rollback(self, ctx: UploadContext, result: StepResult) -> None:
        # Clean up uploaded files on failure
        for remote_path in ctx.uploaded_files:
            ctx.storage.delete(remote_path)
        ctx.uploaded_files.clear()

# Step 4: Cleanup
class CleanupStep(BaseStep[UploadContext]):
    @property
    def name(self) -> str:
        return 'cleanup'

    @property
    def progress_weight(self) -> float:
        return 0.1

    def execute(self, ctx: UploadContext) -> StepResult:
        # Register data units with backend
        for path in ctx.uploaded_files:
            data_unit = ctx.client.create_data_unit({'path': path})
            ctx.data_units.append(data_unit)
        return StepResult(success=True)

class MyUploadAction(BaseUploadAction[UploadParams]):
    action_name = 'upload'

    def setup_steps(self, registry: StepRegistry[UploadContext]) -> None:
        registry.register(InitializeStep())
        registry.register(ValidateStep())
        registry.register(UploadFilesStep())
        registry.register(CleanupStep())
```

## UploadContext Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `runtime_ctx` | `RuntimeContext` | Parent context |
| `params` | `dict` | Action parameters |
| `storage` | `Any` | Storage configuration |
| `source_files` | `list` | Files to upload |
| `uploaded_files` | `list[str]` | Uploaded file paths |
| `data_units` | `list[dict]` | Created data unit records |
| `client` | `BackendClient` | Backend client accessor |

## Execute Return Value

The `execute()` method automatically adds:
- `uploaded_files`: Count of uploaded files
- `data_units`: Count of created data units

```python
# Returned automatically by BaseUploadAction.execute()
{
    'success': True,
    'steps_executed': 4,
    'steps_total': 4,
    'uploaded_files': 100,
    'data_units': 100,
}
```

## Progress Categories (Deprecated)

Step names are now automatically used as progress categories. The old constants still work but are deprecated:

```python
# Old way (deprecated)
self.set_progress(1, 4, self.progress.INITIALIZE)

# New way - step name is auto-used
ctx.set_progress(1, 10)  # Uses current step name as category
```
