---
name: synapse-config-yaml-guide
description: Explains how to write Synapse plugin config.yaml files. Use when the user asks about "config.yaml", "plugin configuration", "action definition", "execution method", "runtime environment", or needs help with synapse plugin settings.
---

# Synapse Plugin config.yaml Guide

The `config.yaml` file (or `synapse.yaml`) defines your plugin's metadata, actions, and runtime configuration.

## Minimal Example

```yaml
name: "My Plugin"
code: my-plugin
version: 1.0.0
category: custom

actions:
  train:
    entrypoint: plugin.train:TrainAction
    method: job
    description: "Train a model"
```

## Complete Structure

```yaml
# Basic metadata
name: "YOLOv8 Object Detection"
code: yolov8
version: 1.0.0
category: neural_net
description: "Train and run YOLOv8 models"
readme: README.md

# Package management
package_manager: pip  # or 'uv'
package_manager_options: []
wheels_dir: wheels

# Environment variables
env:
  DEBUG: "false"
  BATCH_SIZE: "32"

# Runtime environment (Ray)
runtime_env: {}

# Data type configuration
data_type: image
tasks:
  - image.object_detection
  - image.segmentation

# Actions
actions:
  train:
    entrypoint: plugin.train:TrainAction
    method: job
    description: "Train YOLO model"
  inference:
    entrypoint: plugin.inference:run
    method: task
    description: "Run inference"
```

## Action Configuration

| Field | Required | Description |
|-------|----------|-------------|
| `entrypoint` | Yes | Module path (`module.path:ClassName` or `module.path.function`) |
| `method` | No | Execution method: `job`, `task`, or `serve` (default: `task`) |
| `description` | No | Human-readable description |
| `serve_options` | No | Ray Serve deployment tuning (deployment actions only) — see below |

**Config Sync (Recommended)**

Sync entrypoints, input/output types, and hyperparameters from code:

```bash
synapse plugin update-config
```

> Note: `update-config` (and `publish`, which runs it implicitly) discovers actions by scanning **every** `*.py` under the project root and rewrites `config.yaml` in place. It ignores `.synapseignore`/`.gitignore`, so action classes in `refs/`, `examples/`, or a local `.venv/` get pulled in and overwrite your real entrypoints. Publish from a clean staging copy (`--path`) to avoid this — see the publish command docs.

### serve_options (deployment actions)

A `deployment` action passes `serve_options` straight to `serve.deployment()`. These control how the Ray Serve replica handles load — important for GPU model serving where each request can take many seconds.

```yaml
deployment:
  entrypoint: plugin.deployment.InferenceDeployment
  method: job
  serve_options:
    max_ongoing_requests: 32     # requests admitted per replica before backpressure
    health_check_timeout_s: 180  # tolerate slow cold model loads
    health_check_period_s: 30
    # num_replicas, max_queued_requests, autoscaling_config, graceful_shutdown_* also supported
```

| Option | Purpose |
|--------|---------|
| `max_ongoing_requests` | Concurrent requests admitted per replica. **Keep this high** (e.g. 32). A low value (especially `1`) makes the replica return 503 "at capacity" under burst/retry traffic, which the SDK client retries — a storm that fails requests even when the work succeeds. Serialize GPU work with a lock in the handler instead. |
| `health_check_timeout_s` | Raise it (e.g. 180) so a one-time multi-GB cold model download doesn't get the replica killed as "unhealthy". |
| `num_replicas` | Number of replicas (default 1). |

For the handler-side companion fixes (offloading blocking inference with `asyncio.to_thread`, the GPU lock), see the inference-action reference in the specialized-actions skill.

## Execution Methods

| Method | Use Case | Characteristics |
|--------|----------|-----------------|
| `job` | Training, batch processing | Async, isolated, long-running (100s+) |
| `task` | Interactive operations | Sync, fast startup (<1s), serial per actor |
| `serve` | Model serving, inference | REST API endpoint, auto-scaling |

## Entrypoint Formats

Both formats are supported:
- **Colon notation**: `plugin.train:TrainAction`
- **Dot notation**: `plugin.train.TrainAction`

## Additional Resources

For detailed configuration options:
- **[references/fields.md](references/fields.md)** - All config.yaml fields
- **[references/smart-tool.md](references/smart-tool.md)** - Smart tool configuration
