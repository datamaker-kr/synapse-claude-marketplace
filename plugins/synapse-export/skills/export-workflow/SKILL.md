---
name: synapse-export-workflow
description: >
  Use when user mentions "export", "download annotations", "ground truth",
  "export project", "COCO format", "YOLO format", "Pascal VOC",
  "export assignments", "export tasks", "download labels".
---

# Synapse Export Workflow

Core knowledge for exporting annotation data, ground truth datasets, and task data from Synapse. Covers three export targets, multiple output formats, and both plugin-based and script-based execution.

## Interactive-First Principle

This workflow is designed to be **fully interactive**. When the user invokes the export with missing parameters, use `AskUserQuestion` to guide them through each step. Never fail or show usage text for missing arguments — always ask conversationally.

## Prerequisites Validation

Before starting any export workflow, run `synapse doctor` to verify the environment:

```bash
synapse doctor
```

**Required**: Authentication and token checks must pass.

If `synapse` is not installed: `uv pip install "synapse-sdk>=2026.1.39"`
If auth fails: `synapse login` to re-authenticate.

## Key Concepts

### Export Targets

Synapse exports data from one of three **targets** — each represents a different stage of the annotation pipeline:

| Target | Description | Required Filter | Use Case |
|--------|-------------|----------------|----------|
| `assignment` | Annotation work by labelers/reviewers | `project` ID | Export labeled results, QA reviews |
| `ground_truth` | Curated reference datasets for ML | `ground_truth_dataset_version` ID | Export training/validation data |
| `task` | Tasks with data unit links and annotations | `project` ID | Export task metadata + annotations |

### Target Data Structure

Each export target yields items with this structure:

```python
{
    'data': { ... },    # Annotation data (DM Schema v1 format)
    'files': { ... },   # File metadata (URLs, dimensions, etc.)
    'id': 123,          # Record ID (assignment/ground_truth_event/task)
}
```

**Annotation data** follows the **DM Schema v1** format:
```json
{
    "assignmentId": "job-123",
    "annotations": {
        "image_1": [
            {"id": "abc123", "type": "bbox", "data": [100, 200, 50, 80], "classification": "car", ...},
            {"id": "def456", "type": "polygon", "data": [[10,20],[30,40],...], "classification": "road", ...}
        ]
    },
    "annotationsData": {
        "image_1": [
            {"id": "abc123", "type": "bbox", ...},
            {"id": "def456", "type": "polygon", ...}
        ]
    },
    "relations": {},
    "annotationGroups": {},
    "extra": {}
}
```

**Key annotation types** in `annotations`:
- **bbox** (bounding box): `data: [x, y, width, height]`
- **polygon**: `data: [[x1,y1], [x2,y2], ...]`
- **polyline**: `data: [[x1,y1], [x2,y2], ...]`
- **keypoint**: `data: [[x1,y1], [x2,y2], ...]` with skeleton
- **classification**: label-only, no spatial data

### Export Formats

Common output formats the skill should support:

| Format | Extension | Description |
|--------|-----------|-------------|
| **Synapse JSON** | `.json` | Raw DM Schema — lossless, full fidelity |
| **COCO** | `.json` | MS COCO format — bbox, segmentation, keypoints |
| **YOLO** | `.txt` | YOLO darknet — one `.txt` per image with `class x_center y_center width height` |
| **Pascal VOC** | `.xml` | VOC XML format — bounding boxes |
| **CSV** | `.csv` | Tabular — flatten annotations to rows |
| **Custom** | varies | User-defined transformation |

The SDK includes converters for some formats:
```python
from synapse_sdk.utils.converters.coco.from_dm import DMtoCOCOConverter
# converter = DMtoCOCOConverter()
# coco_data = converter.convert(dm_v1_data, output_dir, original_file_dir)
```

### Storage

Export output is written to a **storage** destination. This can be:
- The agent's mounted storage (accessible from Ray worker)
- A remote storage (S3, GCS, MinIO) via `get_pathlib()`
- Local filesystem on the Ray worker (temporary)

### Project & Ground Truth Discovery

**Listing projects:**
```python
# No SDK method for listing projects directly — use the backend API
import requests
resp = requests.get(
    f"{os.environ['SYNAPSE_HOST']}/api/annotation/projects/",
    headers={"Authorization": f"Token {os.environ['SYNAPSE_ACCESS_TOKEN']}"},
)
projects = resp.json()['results']
for p in projects:
    print(f"  ID {p['id']}: {p['name']}")
```

**Listing ground truth datasets:**
```python
from synapse_sdk.clients.backend import BackendClient
client = BackendClient(
    base_url=os.environ['SYNAPSE_HOST'],
    access_token=os.environ['SYNAPSE_ACCESS_TOKEN'],
)
# List GT versions for a dataset
versions = client.list_ground_truth_versions(params={'ground_truth_dataset': <dataset_id>})
```

## Export Approaches

### Approach 1: Script-Based Export (Recommended)

Write a custom Python export script and submit via `synapse script submit`. This gives full control over:
- Output format (COCO, YOLO, CSV, custom)
- Filtering and post-processing
- File organization
- Local or remote output

**Script pattern:**
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
OUTPUT_DIR = Path('/tmp/export_output')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Fetch all assignments for the project
results, count = client.list_assignments(
    params={'project': PROJECT_ID},
    list_all=True,
)
print(f"Found {count} assignments to export")

# Export each assignment
for i, assignment in enumerate(results):
    data = assignment['data']       # DM Schema v1 annotation data
    files = assignment['file']      # File metadata
    assignment_id = assignment['id']

    # === CONVERT TO DESIRED FORMAT HERE ===
    # Example: save as raw JSON
    output_path = OUTPUT_DIR / f'{assignment_id}.json'
    with open(output_path, 'w') as f:
        json.dump({'data': data, 'files': files, 'id': assignment_id}, f, indent=2)

    if (i + 1) % 100 == 0:
        print(f"Exported {i + 1}/{count}...")

print(f"\nDone! Exported {count} assignments to {OUTPUT_DIR}")
```

**Adapt the conversion section** to the desired output format (COCO, YOLO, etc.).

### Approach 2: Plugin-Based Export

If an export plugin is installed on the agent, use the plugin framework:

```bash
synapse plugin run export --plugin <plugin-code> --mode job --params '{
    "name": "My Export",
    "target": "assignment",
    "filter": {"project": 123},
    "storage": 11,
    "path": "/exports/my_export",
    "save_original_file": true,
    "extra_params": {}
}'
```

Monitor via:
```bash
synapse plugin job get <job-id>
synapse plugin job logs <job-id> --follow
```

**When to use plugin-based export:**
- An export plugin is already installed and configured
- The plugin supports the desired output format
- The user wants the standard export pipeline (fetch → convert → save to storage)

## Export Parameters (Plugin Mode)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | Yes | — | Human-readable export name |
| `description` | string | No | null | Export description |
| `target` | string | Yes | — | `assignment`, `ground_truth`, or `task` |
| `filter` | dict | Yes | — | Target-specific filter (see below) |
| `storage` | int | Yes | — | Destination storage ID |
| `path` | string | Yes | — | Export path within storage |
| `save_original_file` | bool | No | true | Include original data files |
| `extra_params` | dict | No | null | Format-specific options |

### Filter by Target

| Target | Required Fields | Optional Fields |
|--------|----------------|-----------------|
| `assignment` | `project` (int) | `status`, `user`, `tags`, date range |
| `ground_truth` | `ground_truth_dataset_version` (int) | `category` (train/validation/test) |
| `task` | `project` (int) | `status`, `tags`, date range |

## Format Conversion Reference

### DM Schema v1 → COCO

```python
from synapse_sdk.utils.converters.coco.from_dm import DMtoCOCOConverter

converter = DMtoCOCOConverter()
# Input: DM v1 data dict
# Output: COCO JSON saved to output_dir
converter.convert(dm_v1_data, output_dir='/tmp/coco_output', original_file_dir='/tmp/images')
```

COCO output structure:
```json
{
    "images": [{"id": 1, "file_name": "img.png", "width": 1920, "height": 1080}],
    "annotations": [{"id": 1, "image_id": 1, "category_id": 1, "bbox": [x,y,w,h], "area": 4000, ...}],
    "categories": [{"id": 1, "name": "car"}]
}
```

### DM Schema v1 → YOLO

Manual conversion (no SDK converter yet):

```python
def dm_to_yolo(annotations, image_width, image_height, class_map):
    """Convert DM annotations to YOLO format.

    Args:
        annotations: List of annotation dicts from DM Schema
        image_width: Image width in pixels
        image_height: Image height in pixels
        class_map: {class_name: class_id} mapping

    Returns:
        List of YOLO lines: "class_id x_center y_center width height"
    """
    lines = []
    for ann in annotations:
        if ann.get('type') != 'bbox':
            continue
        x, y, w, h = ann['data']
        class_id = class_map.get(ann['classification'], 0)
        # YOLO uses normalized center coordinates
        x_center = (x + w / 2) / image_width
        y_center = (y + h / 2) / image_height
        norm_w = w / image_width
        norm_h = h / image_height
        lines.append(f"{class_id} {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}")
    return lines
```

### DM Schema v1 → Pascal VOC

Manual conversion:

```python
def dm_to_voc_xml(annotations, image_info, filename):
    """Convert DM annotations to Pascal VOC XML."""
    import xml.etree.ElementTree as ET
    root = ET.Element('annotation')
    ET.SubElement(root, 'filename').text = filename
    size = ET.SubElement(root, 'size')
    ET.SubElement(size, 'width').text = str(image_info.get('width', 0))
    ET.SubElement(size, 'height').text = str(image_info.get('height', 0))
    ET.SubElement(size, 'depth').text = str(image_info.get('channels', 3))

    for ann in annotations:
        if ann.get('type') != 'bbox':
            continue
        x, y, w, h = ann['data']
        obj = ET.SubElement(root, 'object')
        ET.SubElement(obj, 'name').text = ann['classification']
        bbox = ET.SubElement(obj, 'bndbox')
        ET.SubElement(bbox, 'xmin').text = str(int(x))
        ET.SubElement(bbox, 'ymin').text = str(int(y))
        ET.SubElement(bbox, 'xmax').text = str(int(x + w))
        ET.SubElement(bbox, 'ymax').text = str(int(y + h))

    return ET.tostring(root, encoding='unicode')
```

## SDK Methods Reference

| Method | Purpose |
|--------|---------|
| `client.list_assignments(params, list_all=True)` | Fetch all assignments for a project |
| `client.list_tasks(params, list_all=True)` | Fetch all tasks for a project (expand: data_unit, assignment, workshop) |
| `client.list_ground_truth_events(params, list_all=True)` | Fetch GT events for a dataset version |
| `client.get_project(id)` | Get project details and configuration |
| `client.get_ground_truth_version(id)` | Get GT dataset version details |
| `client.get_storage(id)` | Get storage configuration |
| `client.get_default_storage()` | Get default storage |
| `client.get_data_collection(id)` | Get data collection specs |

## Directory Patterns

### Standard Export Layout

```
export_output/
├── annotations/        # Converted annotation files (JSON/COCO/YOLO/VOC)
│   ├── 001.json
│   ├── 002.json
│   └── ...
├── images/             # Original files (if save_original_file=true)
│   ├── 001.png
│   ├── 002.png
│   └── ...
├── metadata/           # Export metadata
│   └── export_summary.json
└── classes.txt         # Class list (for YOLO/COCO)
```

### COCO Layout

```
coco_export/
├── annotations/
│   ├── instances_train.json    # COCO annotations
│   └── instances_val.json
├── images/
│   ├── train/
│   └── val/
└── classes.json
```

### YOLO Layout

```
yolo_export/
├── images/
│   ├── train/
│   │   ├── 001.png
│   │   └── ...
│   └── val/
├── labels/
│   ├── train/
│   │   ├── 001.txt
│   │   └── ...
│   └── val/
├── data.yaml           # YOLO dataset config
└── classes.txt
```

## Large Dataset Strategies

For projects with 10,000+ annotations:

1. **Use `list_all=True`**: SDK handles pagination automatically
2. **Process in batches**: Write output files in chunks, don't hold everything in memory
3. **Stream processing**: Iterate over results with a generator
4. **Use job mode**: Submit via `synapse script submit` for long-running exports
5. **Report progress**: Print status every N items so the user can monitor via `synapse script logs`
