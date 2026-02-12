---
description: Show all available Synapse export commands and features
---

# Synapse Export Help

Export annotation data, ground truth datasets, and task data from Synapse projects. Supports multiple output formats (JSON, COCO, YOLO, Pascal VOC) and both script-based and plugin-based execution.

## Available Commands

| Command | Description |
|---------|-------------|
| `/synapse-export:help` | Show this help message |
| `/synapse-export:export` | Export data from a Synapse project |
| `/synapse-export:export-status` | Check status and logs of an export job |

## Skills (Auto-Activated)

The following skills automatically activate based on conversation context:

| Skill | Triggers |
|-------|----------|
| **export-workflow** | "export", "download annotations", "ground truth", "COCO format", "YOLO format", "Pascal VOC", "export assignments", "export tasks", "download labels" |

## Agents (Autonomous)

| Agent | Purpose |
|-------|---------|
| **export-assistant** | Full export orchestrator — analyze annotations, convert formats, execute export |

## Prerequisites

| Requirement | Minimum Version | Check Command |
|-------------|----------------|---------------|
| Python | 3.12+ | `python3 --version` |
| synapse-sdk | >= 2026.1.39 | `synapse --version` |
| Synapse authentication | — | `synapse doctor` |

### Environment Setup

```bash
# Install synapse CLI
uv pip install "synapse-sdk[all]>=2026.1.39"

# Authenticate
synapse login

# Verify
synapse doctor
```

## Quick Start

1. **Export annotations**: `/synapse-export:export --project 42 --format coco`
2. **Export ground truth**: `/synapse-export:export --target ground_truth --gt-version 15 --format yolo`
3. **Check job status**: `/synapse-export:export-status <job-id>`

## Examples

### Export project annotations as COCO
```
/synapse-export:export --project 42 --target assignment --format coco
```

### Export ground truth as YOLO with train/val split
```
/synapse-export:export --target ground_truth --gt-version 15 --format yolo --split 0.8/0.2
```

### Export raw JSON with original files
```
/synapse-export:export --project 42 --format json --save-original-files
```

### Interactive export (no arguments)
```
/synapse-export:export
```

## Export Targets

| Target | Source | Required | Use Case |
|--------|--------|----------|----------|
| **assignment** | Labeler/reviewer work | Project ID | Export labeled annotations |
| **ground_truth** | Curated GT datasets | GT version ID | Export training/validation data |
| **task** | Task definitions + annotations | Project ID | Export task metadata |

## Output Formats

| Format | Best For | Annotation Types |
|--------|----------|-----------------|
| **JSON** (Synapse) | Full fidelity export, backup | All types |
| **COCO** | Object detection, segmentation | bbox, polygon, keypoint |
| **YOLO** | Real-time detection models | bbox only |
| **Pascal VOC** | Classic detection benchmarks | bbox only |
| **CSV** | Spreadsheet analysis | Classification, simple attributes |

## How It Works

1. **Select target** — Choose what to export (assignments, ground truth, tasks)
2. **Analyze data** — Sample annotations to understand types and classes
3. **Choose format** — Pick output format based on annotation types
4. **Plan export** — Show summary with item count, format, and output structure
5. **Execute** — Write export script and submit via `synapse script submit`
6. **Report** — Display results with output file details

## Getting Help

- Ask about export formats: "What format should I use for YOLO training?"
- Ask about filtering: "Can I export only reviewed assignments?"
- Ask about splitting: "How do I create train/val/test splits?"
- Ask about large exports: "How do I export 50,000 annotations efficiently?"
- Ask about custom formats: "I need a custom CSV with specific columns"

The relevant skills will automatically load to provide detailed guidance.
