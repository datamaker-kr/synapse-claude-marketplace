---
description: Show all available Synapse upload commands and features
---

# Synapse Upload Help

Upload files from local or remote sources to Synapse data collections using AI-powered file mapping. Supports local filesystem, S3, GCS, SFTP, single-path and multi-path modes, and Excel metadata.

## Available Commands

| Command | Description |
|---------|-------------|
| `/synapse-upload:help` | Show this help message |
| `/synapse-upload:upload` | Upload files to a data collection |
| `/synapse-upload:upload-status` | Check status and logs of an upload job |

## Skills (Auto-Activated)

The following skills automatically activate based on conversation context:

| Skill | Triggers |
|-------|----------|
| **upload-workflow** | "upload", "data collection", "file specifications", "data units", "s3 upload", "multi-path", "excel metadata", "data unit metadata", "meta schema" |
| **file-conversion** | "convert", "tiff to png", "file format", "unsupported extension" |

## Agents (Autonomous)

| Agent | Purpose |
|-------|---------|
| **upload-assistant** | Full upload orchestrator — explore any source, plan mapping, execute upload |

## Prerequisites

| Requirement | Minimum Version | Check Command |
|-------------|----------------|---------------|
| Python | 3.12+ | `python3 --version` |
| synapse-sdk | >= 2026.1.39 | `synapse --version` |
| Synapse authentication | — | `synapse doctor` |

### Environment Setup

```bash
# Try the current shell first (venv may already be activated)
synapse --version

# If not found, look for a venv in cwd and activate it
ls -d *venv* .venv 2>/dev/null
source .venv/bin/activate  # or whichever venv dir was found

# If no venv exists, install manually
uv pip install "synapse-sdk[all]>=2026.1.39"

# Authenticate (saves config to ~/.synapse/config.json)
synapse login

# Verify everything works
synapse doctor

# For S3 sources (if needed)
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...

# For GCS sources (if needed)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Quick Start

1. **Upload files**: `/synapse-upload:upload /data/my_scans --data-collection 42 --storage 11`
2. **Dry run first**: `/synapse-upload:upload /data/my_scans --data-collection 42 --storage 11 --dry-run`
3. **Check job status**: `/synapse-upload:upload-status <job-id>`

## Examples

### Local filesystem upload
```
/synapse-upload:upload /mnt/data/patient_scans --data-collection 2973 --storage 11
```

### S3 source upload
```
/synapse-upload:upload s3://my-bucket/datasets/ct --data-collection 42 --storage 11
```

### Multi-path upload (different source per file spec)
```
/synapse-upload:upload --multi-path --data-collection 42 --storage 11 \
  --assets '{"image_1": "/nas/images", "label_1": "s3://bucket/labels"}'
```

### Upload with Excel metadata
```
/synapse-upload:upload /data/scans --data-collection 42 --storage 11 --metadata /data/patients.xlsx
```

### Upload with project assignment
```
/synapse-upload:upload /data/images --data-collection 42 --storage 11 --project 5
```

### Dry run to preview mapping without uploading
```
/synapse-upload:upload /data/images --data-collection 42 --storage 11 --dry-run
```

## Supported Source Types

| Source | Example | Notes |
|--------|---------|-------|
| Local filesystem | `/data/scans`, `./data` | Direct access via Glob/Bash |
| Amazon S3 / MinIO | `s3://bucket/prefix` | Needs AWS credentials |
| Google Cloud Storage | `gs://bucket/prefix` | Needs GCS credentials |
| SFTP | `sftp://host/path` | Needs SSH credentials |
| Storage-relative | `datasets/batch_42` | Resolved via storage config |

## Upload Modes

| Mode | Use When | Flag |
|------|----------|------|
| **Single-path** (default) | All specs share one source directory | (default) |
| **Multi-path** | Each spec has its own source path | `--multi-path` + `--assets` |

## How It Works

1. **Validate** — Check source path accessibility (local or cloud)
2. **Fetch specs** — Get file specifications and data unit meta schema from the data collection
3. **Explore** — Examine directory structure (adapted to source type)
4. **Plan mapping** — Determine file→spec mapping, detect conversions, resolve metadata sources
5. **Confirm** — Present upload plan for user approval (including metadata coverage)
6. **Execute** — Write upload script and submit via `synapse script submit`
7. **Report** — Display summary of uploaded files and created data units

## Getting Help

- Ask about upload workflow: "How does file-to-spec mapping work?"
- Ask about conversion: "Can I upload TIFF files to a collection that expects PNG?"
- Ask about large datasets: "How do I upload 10,000+ files efficiently?"
- Ask about cloud sources: "How do I upload from S3?"
- Ask about multi-path: "My images and labels are in different directories"
- Ask about metadata: "I have an Excel file with patient metadata"
- Ask about data unit meta: "My collection has a meta schema — how do I populate it?"

The relevant skills will automatically load to provide detailed guidance.
