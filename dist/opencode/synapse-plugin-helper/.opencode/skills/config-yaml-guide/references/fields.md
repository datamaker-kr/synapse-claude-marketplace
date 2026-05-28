# config.yaml Field Reference

## Plugin Metadata

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | - | Human-readable plugin name |
| `code` | string | Yes | - | Unique identifier (slug format) |
| `version` | string | No | `0.1.0` | Semantic version |
| `category` | string | No | `custom` | Plugin category |
| `description` | string | No | `""` | Plugin description |
| `readme` | string | No | `README.md` | Path to README file |

## Package Management

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `package_manager` | string | `pip` | Package manager: `pip` or `uv` |
| `package_manager_options` | list | `[]` | Additional options |
| `wheels_dir` | string | `wheels` | Directory for local .whl files |

## Runtime Environment

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `env` | dict | `{}` | Environment variables |
| `runtime_env` | dict | `{}` | Ray runtime_env configuration |

### env - Environment Variables

Plugin-specific environment variables available via `ctx.env.get('KEY')`:

```yaml
env:
  API_KEY: "your-api-key"
  DEBUG: "true"
  MODEL_CACHE: "/tmp/models"
```

### runtime_env - Ray Runtime Configuration

Controls the Ray execution environment. Used for job/task execution modes.

```yaml
runtime_env:
  pip:
    - torch>=2.0.0
    - transformers
  env_vars:
    CUDA_VISIBLE_DEVICES: "0"
  working_dir: ./src
  py_modules:
    - ./custom_lib
```

**Available runtime_env Options:**

| Option | Type | Description |
|--------|------|-------------|
| `pip` | list | Python packages to install |
| `conda` | dict | Conda environment specification |
| `env_vars` | dict | Environment variables for Ray workers |
| `working_dir` | str | Working directory to upload |
| `py_modules` | list | Local Python modules to include |
| `excludes` | list | File patterns to exclude from upload |

**Example: GPU Training with Dependencies**

```yaml
runtime_env:
  pip:
    - torch==2.1.0
    - ultralytics>=8.0.0
  env_vars:
    CUDA_VISIBLE_DEVICES: "0,1"
    TORCH_HOME: "/cache/torch"
  excludes:
    - "*.pyc"
    - "__pycache__"
```

**Note**: `runtime_env` is only used when `method: job` or `method: task`. For `method: local`, use `env` instead.

## Data Type Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `data_type` | string | `null` | Primary data type (image, video, text, etc.) |
| `tasks` | list | `[]` | Supported tasks (`data_type.task_name`) |
| `supported_data_type` | list | `[]` | Data types for upload plugins |

## Smart Tool Configuration

| Field | Type | Description |
|-------|------|-------------|
| `annotation_category` | string | Annotation category |
| `annotation_type` | string | Annotation type (bbox, polygon, etc.) |
| `smart_tool` | string | Smart tool type (automatic, interactive, semi_automatic) |

## Action Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `entrypoint` | string | Yes | - | Module path to action |
| `method` | string | No | `task` | Execution method |
| `description` | string | No | `""` | Action description |
| `input_type` | string | No | `null` | Semantic input type |
| `output_type` | string | No | `null` | Semantic output type |
| `hyperparameters` | dict | No | `null` | Auto-generated UI schema for training params |

### hyperparameters - UI Schema (Auto-generated)

`hyperparameters.train_ui_schemas` is generated from Pydantic params when you run:

```bash
synapse plugin update-config
```

## Category Values

```yaml
category: neural_net    # ML model training/inference
category: export        # Data format conversion
category: upload        # External data import
category: smart_tool    # AI-assisted annotation
category: pre_annotation   # Pre-labeling processing
category: post_annotation  # Post-labeling processing
category: data_validation  # Data quality checks
category: custom        # User-defined
```

## Data Type Values

```yaml
data_type: image
data_type: video
data_type: text
data_type: audio
data_type: pcd
```

## Example Tasks

```yaml
tasks:
  - image.object_detection
  - image.segmentation
  - image.classification
  - video.tracking
  - text.ner
  - audio.transcription
```
