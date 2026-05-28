# Orchestrator

Executes workflow steps with progress tracking and automatic rollback.

## Import

```python
from synapse_sdk.plugins.steps import Orchestrator, StepRegistry
```

## Class Definition

```python
class Orchestrator[C: BaseStepContext]:
    def __init__(
        self,
        registry: StepRegistry[C],
        context: C,
        progress_callback: Callable[[int, int], None] | None = None,
    ) -> None

    def execute(self) -> dict[str, Any]
```

## Constructor Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `registry` | `StepRegistry[C]` | Registry with steps to execute |
| `context` | `C` | Shared context for steps |
| `progress_callback` | `Callable` | Optional progress callback |

## Usage

### Basic Usage

```python
from synapse_sdk.plugins.steps import StepRegistry, Orchestrator

# Setup
registry = StepRegistry[MyContext]()
registry.register(LoadStep())
registry.register(ProcessStep())
registry.register(SaveStep())

context = MyContext(runtime_ctx=runtime_ctx)

# Execute
orchestrator = Orchestrator(registry, context)
result = orchestrator.execute()

print(result)
# {'success': True, 'steps_executed': 3, 'steps_total': 3}
```

### With Progress Callback

```python
def on_progress(current: int, total: int) -> None:
    print(f"Progress: {current}/{total}%")

orchestrator = Orchestrator(
    registry=registry,
    context=context,
    progress_callback=on_progress,
)
result = orchestrator.execute()
```

### In Specialized Actions

```python
class MyTrainAction(BaseTrainAction[TrainParams]):
    def setup_steps(self, registry: StepRegistry[TrainContext]) -> None:
        registry.register(LoadDatasetStep())
        registry.register(TrainStep())
        registry.register(UploadModelStep())

    # run() method automatically creates Orchestrator and executes
```

## Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestrator.execute()                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   For each step in registry.get_steps():                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 1. Set context.current_step = step.name             │   │
│   │ 2. Check step.can_skip(context)                     │   │
│   │    └─ If True: mark as skipped, continue            │   │
│   │ 3. Execute step.execute(context)                    │   │
│   │    └─ If exception: StepResult(success=False)       │   │
│   │ 4. Store result in context.step_results             │   │
│   │ 5. If not success:                                  │   │
│   │    └─ Call _rollback() and raise RuntimeError       │   │
│   │ 6. Update progress based on step weight             │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   Clear context.current_step = None                         │
│   Return {'success': True, 'steps_executed': N, ...}        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Rollback Behavior

On failure, rollback is called for all executed steps in **reverse order**:

```python
# Execution order: Step1 → Step2 → Step3 (fails)
# Rollback order: Step2.rollback() → Step1.rollback()
```

Rollback errors are caught and logged but don't prevent other rollbacks:

```python
def _rollback(self) -> None:
    for step, result in reversed(self._executed_steps):
        try:
            step.rollback(self._context, result)
        except Exception:
            # Log error but continue with other rollbacks
            self._context.errors.append(f"Rollback failed for '{step.name}'")
```

## Progress Calculation

Progress is calculated from step weights:

```python
# Steps with weights: 0.2, 0.6, 0.2
LoadStep()    # progress_weight = 0.2
TrainStep()   # progress_weight = 0.6
UploadStep()  # progress_weight = 0.2

# After each step completes:
# LoadStep done:   0.2 / 1.0 = 20%
# TrainStep done:  0.8 / 1.0 = 80%
# UploadStep done: 1.0 / 1.0 = 100%
```

## Return Value

```python
{
    'success': True,
    'steps_executed': 3,  # Successfully executed steps
    'steps_total': 3,     # Total steps in registry
}
```

## Error Handling

```python
try:
    result = orchestrator.execute()
except RuntimeError as e:
    # e.g., "Step 'train' failed: Out of memory"
    print(f"Workflow failed: {e}")
    # Rollback has already been performed
```

## Accessing Step Results

After execution, results are stored in context:

```python
orchestrator.execute()

for result in context.step_results:
    if result.skipped:
        print(f"Skipped step")
    elif result.success:
        print(f"Success: {result.data}")
    else:
        print(f"Failed: {result.error}")
```
