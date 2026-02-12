---
description: Export annotations, ground truth, or task data from a Synapse project
argument-hint: [--project <id>] [--target <assignment|ground_truth|task>] [--format <json|coco|yolo|voc>] [--output <path>] [--storage <id>]
allowed-tools: ["Bash", "Read", "Glob", "Grep", "AskUserQuestion"]
---

# Synapse Export Command

You will help the user export annotation data from a Synapse project. Exports can target assignments (labeler work), ground truth datasets (curated ML data), or tasks (task metadata + annotations). Output formats include raw JSON, COCO, YOLO, Pascal VOC, CSV, or custom.

## Interactive-First Design

**IMPORTANT**: This command is designed to be fully interactive. Users may invoke it with no arguments at all — just `/synapse-export:export`. When this happens, guide them step-by-step through the entire process using `AskUserQuestion`. Never fail or dump usage text when arguments are missing.

The user can also provide all arguments upfront to skip the interactive flow. Any combination works — ask only for what's missing.

## Arguments (all optional — will be asked interactively if missing)

- `--project <id>`: Project ID (for assignment/task targets)
- `--gt-version <id>`: Ground truth dataset version ID (for ground_truth target)
- `--target <type>`: Export target — `assignment`, `ground_truth`, or `task`
- `--format <fmt>`: Output format — `json`, `coco`, `yolo`, `voc`, `csv`, or `custom`
- `--output <path>`: Output directory (local path on Ray worker, default: `/tmp/synapse_export_<name>`)
- `--storage <id>`: Storage ID (for plugin-based export)
- `--save-original-files`: Include original data files in export
- `--filter '<json>'`: Additional filter criteria as JSON
- `--dry-run`: Preview what will be exported without executing
- `--split <ratio>`: Train/val/test split (e.g., `0.8/0.1/0.1`)

## Workflow

### Step 1: Validate Prerequisites

Find the `synapse` CLI — try the current shell first, then search for a venv in cwd:

```bash
synapse --version 2>/dev/null || {
  VENV_DIR=$(ls -d *venv* .venv 2>/dev/null | head -1)
  [ -n "$VENV_DIR" ] && source "$VENV_DIR/bin/activate"
}
```

Assert version >= 2026.1.39:

```bash
python3 -c "
from importlib.metadata import version
v = version('synapse-sdk')
parts = [int(x) for x in v.split('.')[:3]]
assert parts >= [2026, 1, 39], f'synapse-sdk {v} is too old, need >= 2026.1.39'
print(f'synapse-sdk {v} OK')
"
```

If `synapse` is not found and no venv exists, guide the user: `uv pip install "synapse-sdk>=2026.1.39"`

Then validate the environment:

```bash
synapse doctor
```

Do not proceed until authentication and token checks pass.

### Step 2: Gather Parameters (Interactive Wizard)

For **every missing parameter**, use `AskUserQuestion` to ask the user.

**Step 2a: Export Target** — Ask first because this determines what filters we need:
```
"What do you want to export?"
Options:
  - "Annotations from a project (assignments)" → target = assignment
  - "Ground truth dataset for ML training" → target = ground_truth
  - "Task data from a project" → target = task
```

**Step 2b: Source Selection** — Depends on target:

For `assignment` or `task` targets:
```
"Which project should we export from?"
Options:
  - "I know the project ID" → ask for the integer ID
  - "Help me find it" → list recent projects from the API
```

If "help me find it", list projects:
```python
python3 -c "
import requests, json, os
config_path = os.path.expanduser('~/.synapse/config.json')
with open(config_path) as f:
    cfg = json.load(f)
resp = requests.get(
    f\"{cfg['host']}/api/annotation/projects/\",
    headers={'Authorization': f\"Token {cfg['access_token']}\"},
)
for p in resp.json().get('results', [])[:20]:
    print(f\"  ID {p['id']}: {p['name']}\")
"
```

For `ground_truth` target:
```
"Which ground truth dataset version?"
Options:
  - "I know the version ID" → ask for the integer ID
  - "Help me find it" → ask for GT dataset ID first, then list versions
```

**Step 2c: Output Format** — Ask what format to export in:
```
"What output format do you need?"
Options:
  - "Synapse JSON (raw, lossless)" → format = json
  - "COCO (for object detection/segmentation)" → format = coco
  - "YOLO (darknet format)" → format = yolo
  - "Custom (I'll describe what I need)" → ask for details
```

**Step 2d: Output Directory** — Always ask where to save the export:
```
"Where should the export output be saved? (This is a path on the Ray worker)"
Options:
  - "Default (/tmp/synapse_export_<project_name>)" → use default path
  - "I'll specify a path" → ask for the full path
```

**Step 2e: Additional Options**:
```
"Any additional options?"
Options:
  - "Include original files (images, etc.)" → save_original_file = true
  - "Split into train/val/test" → ask for split ratio
  - "Filter by status/tags" → ask for filter criteria
  - "Just export everything" → proceed with defaults
```

### Step 3: Analyze Source Data

Before exporting, fetch a sample to understand the data:

```python
python3 -c "
from synapse_sdk.clients.backend import BackendClient
import json, os
config_path = os.path.expanduser('~/.synapse/config.json')
with open(config_path) as f:
    cfg = json.load(f)
client = BackendClient(base_url=cfg['host'], access_token=cfg['access_token'])

# For assignment target:
results, count = client.list_assignments(
    params={'project': <PROJECT_ID>, 'limit': 3},
)
print(f'Total assignments: {count}')
if results:
    sample = results[0]
    data = sample.get('data', {})
    annotations = data.get('annotations', {})
    for media_id, anns in annotations.items():
        types = set(a.get('type', '?') for a in anns)
        classes = set(a.get('classification', '?') for a in anns)
        print(f'  {media_id}: {len(anns)} annotations, types={types}, classes={classes}')
"
```

Report to the user:
- Total item count
- Annotation types found (bbox, polygon, keypoint, etc.)
- Class labels found
- Whether format conversion is possible (e.g., YOLO only supports bbox)

### Step 4: Present Export Plan

```
## Export Plan

**Target**: Assignment annotations from Project "CT Detection" (ID: 42)
**Total items**: 1,247 assignments
**Format**: COCO
**Include original files**: Yes
**Split**: 80% train / 10% val / 10% test

### Annotations Summary
- Types: bbox (1,143), polygon (892)
- Classes: car, truck, pedestrian, bicycle (4 classes)
- Note: Polygons will be converted to segmentation masks for COCO format

### Output Structure
```
/tmp/synapse_export_ct_detection/
├── annotations/
│   ├── instances_train.json
│   ├── instances_val.json
│   └── instances_test.json
├── images/
│   ├── train/ (997 images)
│   ├── val/ (125 images)
│   └── test/ (125 images)
└── classes.json
```

Proceed? [Yes / Adjust options / Cancel]
```

If `--dry-run`, stop here.

### Step 5: Execute Export

**CRITICAL: Always use `synapse script submit` to run exports on Ray.** Never run export scripts locally with `python3` — the script must be submitted to the Ray cluster where credentials are auto-injected and compute resources are available.

#### Write the export script

Save to `/tmp/synapse_export_<name>.py`. The script should:
1. Fetch all items from the target via BackendClient
2. Convert annotations to the desired format
3. Optionally download original files
4. Save output to the specified directory
5. Print progress for monitoring

**Template — JSON export:**
```python
#!/usr/bin/env python3
"""Export annotations from project <PROJECT_ID>."""
import json
import os
from pathlib import Path
from synapse_sdk.clients.backend import BackendClient

client = BackendClient(
    base_url=os.environ['SYNAPSE_HOST'],
    access_token=os.environ['SYNAPSE_ACCESS_TOKEN'],
)

PROJECT_ID = <project_id>
OUTPUT_DIR = Path('/tmp/synapse_export_<name>')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
(OUTPUT_DIR / 'annotations').mkdir(exist_ok=True)

# Fetch all assignments
print("Fetching assignments...")
results, count = client.list_assignments(
    params={'project': PROJECT_ID},
    list_all=True,
)
print(f"Found {count} assignments")

# Export
for i, assignment in enumerate(results):
    output_path = OUTPUT_DIR / 'annotations' / f'{assignment["id"]}.json'
    with open(output_path, 'w') as f:
        json.dump({
            'id': assignment['id'],
            'data': assignment['data'],
            'files': assignment.get('file', {}),
        }, f, indent=2, ensure_ascii=False)

    if (i + 1) % 100 == 0:
        print(f"Exported {i + 1}/{count}...")

print(f"\nDone! Exported {count} assignments to {OUTPUT_DIR}")
```

**IMPORTANT**: Adapt the conversion logic to the requested format (COCO, YOLO, VOC, etc.). See the SKILL.md for format conversion reference code.

#### Submit the script (MANDATORY — never run locally)

```bash
synapse script submit /tmp/synapse_export_<name>.py
```

### Step 6: Report Job Submission

Once the job is submitted, print the job ID and tell the user how to monitor:

```
## Job Submitted

- Job ID: <job-id>
- Script: /tmp/synapse_export_<name>.py

### Monitor Progress
  synapse script logs <job-id> --follow

### Check Status Later
  synapse script logs <job-id>
```

If the export output is on the Ray worker, suggest how the user can retrieve it (e.g., `scp`, S3 copy, or re-export to storage).

## Error Handling

| Error | Action |
|-------|--------|
| Project not found | Ask user to verify the project ID |
| GT version not found | Ask user to verify the GT dataset version ID |
| No assignments/tasks found | Check filter criteria, suggest broader filters |
| Format not compatible with annotation type | Warn user (e.g., YOLO doesn't support polygons natively) |
| synapse CLI not found | Look for `*venv*` in cwd and activate; otherwise guide: `uv pip install "synapse-sdk>=2026.1.39"` |
| Missing authentication | Guide: `synapse login`, verify with `synapse doctor` |
| Script execution failed | Check logs, suggest fixes |
| Partial failure | Report progress, offer to retry |

## Large Dataset Guidelines

For projects with 10,000+ annotations:

1. **Use `list_all=True`** — the SDK handles pagination automatically
2. **Stream processing** — don't accumulate all data in memory
3. **Batch file writes** — write output files as you go, not all at the end
4. **Use script submit** — `synapse script submit` for long-running exports
5. **Report progress** — print every 100-500 items so the user can follow via logs

## Flexibility Note

You are an AI assistant with full access to Bash and Python. If the standard export doesn't fit the user's needs, **adapt**:
- Write custom converters for unusual annotation formats
- Post-process exported data (merge, filter, transform)
- Export to multiple formats in one pass
- Download original files via presigned URLs
- Create dataset config files (YOLO data.yaml, COCO info, etc.)
- Split data into train/val/test sets with stratification
