# PluginDiscovery Class

Discover and inspect plugin actions before execution.

## Import

```python
from synapse_sdk.plugins.discovery import PluginDiscovery
```

---

## Class Methods

### from_path(path)

Load plugin from filesystem path.

```python
@classmethod
def from_path(cls, path: Path | str) -> PluginDiscovery
```

```python
# From config.yaml path
discovery = PluginDiscovery.from_path('/path/to/plugin/config.yaml')

# From plugin directory (finds config.yaml automatically)
discovery = PluginDiscovery.from_path('/path/to/plugin')
```

### from_module(module)

Discover plugin from Python module by introspection.

```python
@classmethod
def from_module(
    cls,
    module: ModuleType,
    *,
    name: str | None = None,
    category: PluginCategory = PluginCategory.CUSTOM,
) -> PluginDiscovery
```

```python
import my_plugin

discovery = PluginDiscovery.from_module(my_plugin)
# Automatically finds @action functions and BaseAction subclasses
```

---

## Instance Methods

### list_actions()

Get available action names.

```python
def list_actions(self) -> list[str]
```

```python
actions = discovery.list_actions()
# ['train', 'inference', 'export']
```

### get_action_class(name)

Load action class/function from entrypoint.

```python
def get_action_class(self, name: str) -> type[BaseAction] | Callable
```

```python
action_cls = discovery.get_action_class('train')
# Can be used with executors
```

### get_action_config(name)

Get configuration for a specific action.

```python
def get_action_config(self, name: str) -> ActionConfig
```

```python
config = discovery.get_action_config('train')
print(config.entrypoint)  # 'plugin.train.TrainAction'
print(config.method)       # RunMethod.TASK
```

### get_action_params_model(name)

Get the Pydantic params model for an action.

```python
def get_action_params_model(self, name: str) -> type[BaseModel] | None
```

```python
params_model = discovery.get_action_params_model('train')
if params_model:
    schema = params_model.model_json_schema()
```

### get_action_result_model(name)

Get the Pydantic result model for an action.

```python
def get_action_result_model(self, name: str) -> type[BaseModel] | None
```

```python
result_model = discovery.get_action_result_model('train')
if result_model:
    print(result_model.model_fields)
```

### get_action_method(name)

Get execution method for an action.

```python
def get_action_method(self, name: str) -> RunMethod
```

```python
method = discovery.get_action_method('train')
# RunMethod.TASK or RunMethod.JOB
```

### has_action(name)

Check if an action exists.

```python
def has_action(self, name: str) -> bool
```

```python
if discovery.has_action('train'):
    discovery.get_action_class('train')
```

### get_action_entrypoint(name)

Get entrypoint string without loading the class.

```python
def get_action_entrypoint(self, name: str) -> str
```

```python
entrypoint = discovery.get_action_entrypoint('train')
# 'plugin.train.TrainAction'
```

### get_action_ui_schema(name)

Get FormKit-compatible UI schema for parameters.

```python
def get_action_ui_schema(self, name: str) -> list[dict[str, Any]]
```

```python
ui_schema = discovery.get_action_ui_schema('train')
# [{'$formkit': 'number', 'name': 'epochs', ...}]
```

### get_action_input_type(name) / get_action_output_type(name)

Get semantic types for pipeline compatibility.

```python
input_type = discovery.get_action_input_type('train')
# 'yolo_dataset'

output_type = discovery.get_action_output_type('train')
# 'model_weights'
```

---

## Static Methods

### discover_actions(plugin_dir)

Discover BaseAction subclasses from source files.

```python
@staticmethod
def discover_actions(plugin_dir: Path | str) -> dict[str, dict[str, Any]]
```

```python
actions = PluginDiscovery.discover_actions('/path/to/plugin')
# {
#     'train': {
#         'entrypoint': 'plugin.train.TrainAction',
#         'input_type': 'yolo_dataset',
#         'output_type': 'model_weights',
#         'params_model': <class 'TrainParams'>,
#     }
# }
```

---

## Config Export

### to_config_dict()

Export plugin configuration as a dictionary.

```python
def to_config_dict(self, *, include_ui_schemas: bool = True) -> dict[str, Any]
```

```python
config = discovery.to_config_dict()
# Ready for API submission
```

### to_yaml()

Export as YAML string.

```python
def to_yaml(self, *, include_ui_schemas: bool = True) -> str
```

```python
yaml_str = discovery.to_yaml()
print(yaml_str)
```

### sync_config_file(config_path)

Sync actions from code to config.yaml.

```python
def sync_config_file(
    self,
    config_path: Path | str,
    syncers: list | None = None,
) -> dict[str, str]
```

```python
changes = discovery.sync_config_file('/path/to/plugin/config.yaml')
for action, change in changes.items():
    print(f"{action}: {change}")
```

---

## Properties

### config

Access the underlying PluginConfig.

```python
discovery.config.name      # Plugin name
discovery.config.code      # Plugin code
discovery.config.version   # Plugin version
discovery.config.category  # PluginCategory
discovery.config.actions   # Dict of ActionConfig
```

---

## Complete Example

```python
from synapse_sdk.plugins.discovery import PluginDiscovery
from synapse_sdk.plugins.executors.local import LocalExecutor

# Discover plugin
discovery = PluginDiscovery.from_path('/path/to/plugin')

# List available actions
print("Available actions:", discovery.list_actions())

# Inspect action
if discovery.has_action('train'):
    config = discovery.get_action_config('train')
    print(f"Entrypoint: {config.entrypoint}")
    print(f"Method: {config.method}")

    params_model = discovery.get_action_params_model('train')
    if params_model:
        print(f"Parameters: {params_model.model_fields.keys()}")

# Execute action
action_cls = discovery.get_action_class('train')
executor = LocalExecutor()
result = executor.execute(action_cls, {
    'dataset_id': 123,
    'epochs': 100,
})

print("Result:", result)
```
