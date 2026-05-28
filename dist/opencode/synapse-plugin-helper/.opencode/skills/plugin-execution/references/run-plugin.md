# run_plugin() Function

Programmatically execute plugin actions.

## Import

```python
from synapse_sdk.plugins.runner import run_plugin, ExecutionMode
```

## Function Signature

```python
def run_plugin(
    plugin_code: str,
    action: str,
    params: dict[str, Any] | None = None,
    *,
    mode: ExecutionMode = ExecutionMode.LOCAL,
    **executor_kwargs: Any,
) -> Any
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `plugin_code` | `str` | Yes | Plugin path or module name |
| `action` | `str` | Yes | Action name to execute |
| `params` | `dict` | No | Action parameters |
| `mode` | `ExecutionMode` | No | Execution mode (default: LOCAL) |
| `**executor_kwargs` | | No | Executor-specific options |

### plugin_code

Can be:
- Filesystem path: `/path/to/plugin` or `/path/to/plugin/config.yaml`
- Module path: `my_plugins.yolov8`

### mode (ExecutionMode)

```python
from synapse_sdk.plugins.enums import ExecutionMode

ExecutionMode.LOCAL  # In-process execution
ExecutionMode.TASK   # Ray Actor pool
ExecutionMode.JOB    # Ray Job API
```

### executor_kwargs

| Keyword | Description |
|---------|-------------|
| `action_cls` | Pre-loaded action class (skips discovery) |
| `env` | Environment variables dict |
| `job_id` | Job tracking ID |
| `working_dir` | Working directory (for JOB mode) |
| `runtime_env` | Ray runtime environment |

## Return Value

- **LOCAL/TASK**: Action result (dict or result model instance)
- **JOB**: Job ID string

## Examples

### Basic Local Execution

```python
from synapse_sdk.plugins.runner import run_plugin

result = run_plugin(
    plugin_code='/path/to/plugin',
    action='train',
    params={
        'dataset_id': 123,
        'epochs': 100,
    },
)

print(result)
# {'model_id': 456, 'weights_path': '/models/best.pt'}
```

### Ray Actor Execution

```python
from synapse_sdk.plugins.runner import run_plugin, ExecutionMode

result = run_plugin(
    plugin_code='my_plugins.yolov8',
    action='train',
    params={'epochs': 100},
    mode=ExecutionMode.TASK,
    runtime_env={'pip': ['ultralytics']},
)
```

### Ray Job Execution

```python
from synapse_sdk.plugins.runner import run_plugin, ExecutionMode

job_id = run_plugin(
    plugin_code='/path/to/plugin',
    action='train',
    params={'epochs': 100},
    mode=ExecutionMode.JOB,
    working_dir='/path/to/plugin',
)

print(f"Job submitted: {job_id}")
# Job submitted: raysubmit_abc123

# Poll for job completion separately
```

### With Pre-loaded Action Class

```python
from synapse_sdk.plugins.runner import run_plugin
from synapse_sdk.plugins.discovery import PluginDiscovery

discovery = PluginDiscovery.from_path('/path/to/plugin')
action_cls = discovery.get_action_class('train')

# Skip discovery by providing action class
result = run_plugin(
    plugin_code='/path/to/plugin',
    action='train',
    params={'epochs': 100},
    action_cls=action_cls,  # Direct class reference
)
```

### With Environment Variables

```python
result = run_plugin(
    plugin_code='/path/to/plugin',
    action='train',
    params={'epochs': 100},
    env={
        'CUDA_VISIBLE_DEVICES': '0',
        'API_KEY': 'secret',
    },
)
```

## Error Handling

```python
from synapse_sdk.plugins.errors import ActionNotFoundError

try:
    result = run_plugin(
        plugin_code='/path/to/plugin',
        action='nonexistent',
        params={},
    )
except ActionNotFoundError as e:
    print(f"Action not found: {e}")
    print(f"Available actions: {e.details['available']}")
except Exception as e:
    print(f"Execution failed: {e}")
```

## Mode Selection Guide

| Scenario | Recommended Mode |
|----------|------------------|
| Development/testing | `LOCAL` |
| Quick runs, medium workload | `TASK` |
| Training, heavy compute | `JOB` |
| GPU workloads | `JOB` |
| Requires package installation | `JOB` |
| Multi-node distributed | `JOB` |
