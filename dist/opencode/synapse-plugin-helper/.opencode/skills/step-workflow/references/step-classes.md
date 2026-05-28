# Step Classes

Core classes for defining workflow steps.

## Import

```python
from synapse_sdk.plugins.steps import (
    BaseStep,
    StepResult,
    StepRegistry,
)
```

---

## BaseStep

Abstract base class for workflow steps. Generic type `C` must extend `BaseStepContext`.

```python
class BaseStep[C: BaseStepContext](ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Unique step identifier."""
        ...

    @property
    @abstractmethod
    def progress_weight(self) -> float:
        """Relative weight (0.0-1.0) for progress calculation."""
        ...

    @abstractmethod
    def execute(self, context: C) -> StepResult:
        """Execute the step."""
        ...

    def can_skip(self, context: C) -> bool:
        """Check if step can be skipped. Default: False."""
        return False

    def rollback(self, context: C, result: StepResult) -> None:
        """Rollback step on workflow failure. Default: no-op."""
        pass
```

### Required Properties

#### name

Unique identifier for the step.

```python
@property
def name(self) -> str:
    return 'validate_files'
```

#### progress_weight

Relative weight for progress calculation. Should be between 0.0 and 1.0.

```python
@property
def progress_weight(self) -> float:
    return 0.3  # This step is 30% of total work
```

### Required Method

#### execute(context)

Main step logic. Must return a `StepResult`.

```python
def execute(self, ctx: MyContext) -> StepResult:
    try:
        result = process_data(ctx.data)
        ctx.output = result
        return StepResult(success=True, data={'count': len(result)})
    except Exception as e:
        return StepResult(success=False, error=str(e))
```

### Optional Methods

#### can_skip(context)

Return `True` to skip this step. Called before `execute()`.

```python
def can_skip(self, ctx: MyContext) -> bool:
    return ctx.params.get('skip_validation', False)
```

#### rollback(context, result)

Clean up on workflow failure. Called in reverse order for all executed steps.

```python
def rollback(self, ctx: MyContext, result: StepResult) -> None:
    # Clean up resources created in execute()
    if ctx.temp_files:
        for f in ctx.temp_files:
            f.unlink()
```

### Complete Example

```python
from synapse_sdk.plugins.steps import BaseStep, StepResult

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
        invalid = []
        for file in ctx.files:
            if not self.is_valid(file):
                invalid.append(str(file))

        if invalid:
            return StepResult(
                success=False,
                error=f'Invalid files: {invalid}',
            )

        return StepResult(success=True, data={'validated': len(ctx.files)})

    def is_valid(self, file) -> bool:
        return file.suffix in ['.jpg', '.png']
```

---

## StepResult

Result of a workflow step execution.

```python
@dataclass
class StepResult:
    success: bool = True
    data: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    rollback_data: dict[str, Any] = field(default_factory=dict)
    skipped: bool = False
    timestamp: datetime = field(default_factory=datetime.now)
```

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `success` | `bool` | Whether step completed successfully |
| `data` | `dict` | Output data from the step |
| `error` | `str` | Error message if failed |
| `rollback_data` | `dict` | Data needed for rollback |
| `skipped` | `bool` | Whether step was skipped |
| `timestamp` | `datetime` | Completion time |

### Usage Examples

```python
# Success
return StepResult(success=True, data={'count': 100})

# Failure
return StepResult(success=False, error='File not found')

# With rollback data
return StepResult(
    success=True,
    data={'uploaded': files},
    rollback_data={'files_to_delete': files},
)
```

---

## StepRegistry

Registry for managing ordered workflow steps.

```python
class StepRegistry[C: BaseStepContext]:
    def register(self, step: BaseStep[C]) -> None
    def unregister(self, name: str) -> None
    def get_steps(self) -> list[BaseStep[C]]
    def insert_after(self, after_name: str, step: BaseStep[C]) -> None
    def insert_before(self, before_name: str, step: BaseStep[C]) -> None
    @property
    def total_weight(self) -> float
```

### Methods

#### register(step)

Add step to end of workflow.

```python
registry.register(InitStep())
registry.register(ProcessStep())
registry.register(FinalizeStep())
```

#### unregister(name)

Remove step by name.

```python
registry.unregister('optional_step')
```

#### insert_before / insert_after

Insert at specific position.

```python
registry.register(InitStep())     # [init]
registry.register(FinalizeStep()) # [init, finalize]
registry.insert_before('finalize', ProcessStep())  # [init, process, finalize]
registry.insert_after('init', ValidateStep())      # [init, validate, process, finalize]
```

#### get_steps()

Get ordered list of steps.

```python
for step in registry.get_steps():
    print(f"{step.name}: weight={step.progress_weight}")
```

#### total_weight

Sum of all step weights.

```python
print(f"Total weight: {registry.total_weight}")  # Should be ~1.0
```

### Boolean Check

```python
if registry:  # True if any steps registered
    orchestrator.execute()
```
