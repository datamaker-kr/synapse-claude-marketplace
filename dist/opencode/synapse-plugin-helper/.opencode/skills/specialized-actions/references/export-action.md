# BaseExportAction

Export action base class for data export workflows.

## Import

```python
from synapse_sdk.plugins.actions.export import BaseExportAction, ExportContext
from synapse_sdk.plugins.actions.export.action import ExportProgressCategories
```

## Class Definition

```python
class BaseExportAction(BaseAction[P]):
    category = PluginCategory.EXPORT
    progress = ExportProgressCategories()
```

## Key Methods

### get_filtered_results(filters)

**Abstract method** - Must be overridden to fetch data for export.

```python
def get_filtered_results(self, filters: dict) -> tuple[Any, int]:
    """
    Args:
        filters: Filter criteria dict
    Returns:
        Tuple of (results_iterator, total_count)
    """
    # For assignments:
    return self.client.get_assignments(filters)

    # For ground truth:
    return self.client.get_ground_truth(filters)
```

## Simple Execute Example

```python
from pydantic import BaseModel
from synapse_sdk.plugins.actions.export import BaseExportAction
from typing import Any

class ExportParams(BaseModel):
    project_id: int
    output_format: str = 'coco'
    filter: dict = {}

class MyExportAction(BaseExportAction[ExportParams]):
    action_name = 'export'

    def get_filtered_results(self, filters: dict) -> tuple[Any, int]:
        # Customize based on your target type
        return self.client.get_assignments({
            'project': self.params.project_id,
            **filters,
        })

    def execute(self) -> dict:
        results, count = self.get_filtered_results(self.params.filter)
        self.set_progress(0, count, self.progress.DATASET_CONVERSION)

        output_path = f'/exports/dataset_{self.params.project_id}.zip'
        processed = 0

        for item in results:
            # Process and export item
            self.convert_item(item, output_path)
            processed += 1
            self.set_progress(processed, count, self.progress.DATASET_CONVERSION)

        return {
            'output_path': output_path,
            'exported_count': processed,
            'format': self.params.output_format,
        }
```

## Step-based Example

```python
from synapse_sdk.plugins.actions.export import BaseExportAction, ExportContext
from synapse_sdk.plugins.steps import BaseStep, StepResult, StepRegistry

class FetchResultsStep(BaseStep[ExportContext]):
    @property
    def name(self) -> str:
        return 'fetch_results'

    @property
    def progress_weight(self) -> float:
        return 0.2

    def execute(self, ctx: ExportContext) -> StepResult:
        ctx.results, ctx.total_count = ctx.client.get_assignments(
            ctx.params.get('filter', {})
        )
        return StepResult(success=True)

class ProcessStep(BaseStep[ExportContext]):
    @property
    def name(self) -> str:
        return 'process'

    @property
    def progress_weight(self) -> float:
        return 0.6

    def execute(self, ctx: ExportContext) -> StepResult:
        for item in ctx.results:
            # Process each item
            ctx.exported_count += 1
            ctx.set_progress(ctx.exported_count, ctx.total_count)
        return StepResult(success=True)

class FinalizeStep(BaseStep[ExportContext]):
    @property
    def name(self) -> str:
        return 'finalize'

    @property
    def progress_weight(self) -> float:
        return 0.2

    def execute(self, ctx: ExportContext) -> StepResult:
        ctx.output_path = '/exports/output.zip'
        return StepResult(success=True)

class MyExportAction(BaseExportAction[ExportParams]):
    action_name = 'export'

    def setup_steps(self, registry: StepRegistry[ExportContext]) -> None:
        registry.register(FetchResultsStep())
        registry.register(ProcessStep())
        registry.register(FinalizeStep())
```

## ExportContext Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `runtime_ctx` | `RuntimeContext` | Parent context |
| `params` | `dict` | Action parameters |
| `results` | `Any` | Fetched results iterator |
| `total_count` | `int` | Total items to export |
| `exported_count` | `int` | Items exported so far |
| `output_path` | `str` | Export output path |
| `client` | `BackendClient` | Backend client accessor |

## Progress Categories

| Constant | Value | Description |
|----------|-------|-------------|
| `DATASET_CONVERSION` | `'dataset_conversion'` | Data conversion phase |

```python
self.set_progress(50, 100, self.progress.DATASET_CONVERSION)
```
