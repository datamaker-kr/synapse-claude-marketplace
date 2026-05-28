# Plugin Categories

## Available PluginCategory Values

```python
from synapse_sdk.plugins.enums import PluginCategory
```

| Category | Value | Description |
|----------|-------|-------------|
| `NEURAL_NET` | `neural_net` | ML model training/inference |
| `EXPORT` | `export` | Data format conversion |
| `UPLOAD` | `upload` | External data import |
| `SMART_TOOL` | `smart_tool` | AI-assisted annotation |
| `PRE_ANNOTATION` | `pre_annotation` | Pre-labeling processing |
| `POST_ANNOTATION` | `post_annotation` | Post-labeling processing |
| `DATA_VALIDATION` | `data_validation` | Data quality checks |
| `CUSTOM` | `custom` | User-defined |

## Usage Example

```python
from synapse_sdk.plugins.enums import PluginCategory

@action(
    name='train',
    description='Train YOLO model',
    params=TrainParams,
    category=PluginCategory.NEURAL_NET
)
def train(params: TrainParams, ctx: RuntimeContext) -> dict:
    pass
```

## In Class-Based Actions

```python
class TrainAction(BaseAction[TrainParams]):
    action_name = 'train'
    category = PluginCategory.NEURAL_NET

    def execute(self) -> dict:
        pass
```

## In config.yaml

```yaml
category: neural_net  # Use lowercase string value
```
