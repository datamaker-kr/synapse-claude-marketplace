# Executor Classes

Low-level executor classes for plugin execution.

## Import

```python
from synapse_sdk.plugins.executors.local import LocalExecutor
from synapse_sdk.plugins.executors.ray.task import RayActorExecutor
from synapse_sdk.plugins.executors.ray.job import RayJobExecutor
```

---

## LocalExecutor

In-process synchronous execution. Best for development and testing.

```python
class LocalExecutor:
    def execute(
        self,
        action: type[BaseAction] | Callable,
        params: dict[str, Any],
    ) -> Any
```

### Usage

```python
from synapse_sdk.plugins.executors.local import LocalExecutor
from synapse_sdk.plugins.discovery import PluginDiscovery

discovery = PluginDiscovery.from_path('/path/to/plugin')
action_cls = discovery.get_action_class('train')

executor = LocalExecutor()
result = executor.execute(action_cls, {'epochs': 100})
```

### Characteristics

- Executes in the current process
- No Ray dependency required
- Full access to local filesystem
- Best for debugging (can use breakpoints)
- No isolation between runs

---

## RayActorExecutor

Executes actions on a Ray Actor pool. Good for medium workloads.

```python
class RayActorExecutor:
    def __init__(
        self,
        num_actors: int = 1,
        runtime_env: dict | None = None,
        **kwargs,
    )

    def execute(
        self,
        action: type[BaseAction] | Callable,
        params: dict[str, Any],
    ) -> Any
```

### Usage

```python
from synapse_sdk.plugins.executors.ray.task import RayActorExecutor

executor = RayActorExecutor(
    num_actors=2,
    runtime_env={'pip': ['ultralytics']},
)

result = executor.execute(action_cls, {'epochs': 100})
```

### Characteristics

- Fast startup (actors stay warm)
- Shares Ray cluster resources
- Good for parallel execution
- Runtime environment for dependencies
- Results returned directly

---

## RayJobExecutor

Submits actions as Ray Jobs. Best for heavy workloads.

```python
class RayJobExecutor:
    def __init__(
        self,
        working_dir: Path | str | None = None,
        runtime_env: dict | None = None,
        **kwargs,
    )

    def submit(
        self,
        entrypoint: str,
        params: dict[str, Any],
    ) -> str  # Returns job ID
```

### Usage

```python
from synapse_sdk.plugins.executors.ray.job import RayJobExecutor

executor = RayJobExecutor(
    working_dir='/path/to/plugin',
    runtime_env={
        'uv': {'packages': ['ultralytics', 'torch']},
    },
)

job_id = executor.submit('plugin.train.TrainAction', {'epochs': 100})
print(f"Submitted job: {job_id}")
```

### Characteristics

- Full isolation between jobs
- Package installation support
- GPU allocation
- Can specify resource requirements
- Asynchronous (returns job ID)
- Logs stored separately

---

## Executor Protocol

All executors implement this protocol:

```python
from typing import Protocol

class ExecutorProtocol(Protocol):
    def execute(
        self,
        action: type[BaseAction] | Callable,
        params: dict[str, Any],
    ) -> Any:
        ...
```

---

## Executor Comparison

| Feature | LocalExecutor | RayActorExecutor | RayJobExecutor |
|---------|---------------|------------------|----------------|
| Startup time | Instant | Fast (warm actors) | Slow (job creation) |
| Isolation | None | Partial | Full |
| Package install | No | Limited | Yes |
| GPU support | Local GPU | Shared | Dedicated |
| Return value | Direct | Direct | Job ID |
| Debugging | Easy | Medium | Hard |
| Best for | Dev | Medium tasks | Heavy workloads |

---

## Common Patterns

### Sequential Execution

```python
executor = LocalExecutor()

results = []
for params in params_list:
    result = executor.execute(action_cls, params)
    results.append(result)
```

### Parallel Execution with Actors

```python
import ray

executor = RayActorExecutor(num_actors=4)

@ray.remote
def run_one(params):
    return executor.execute(action_cls, params)

futures = [run_one.remote(p) for p in params_list]
results = ray.get(futures)
```

### Job Submission with Monitoring

```python
from synapse_sdk.plugins.executors.ray.job import RayJobExecutor
import time

executor = RayJobExecutor(working_dir='/path/to/plugin')
job_id = executor.submit('plugin.train.TrainAction', params)

# Monitor job status
while True:
    status = ray.job_submission_client.get_job_status(job_id)
    if status == 'SUCCEEDED':
        logs = ray.job_submission_client.get_job_logs(job_id)
        print(logs)
        break
    elif status == 'FAILED':
        raise RuntimeError(f"Job {job_id} failed")
    time.sleep(10)
```
