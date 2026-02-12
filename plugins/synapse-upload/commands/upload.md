---
description: Upload files from a local or remote source to a Synapse data collection
argument-hint: <path> --data-collection <id> --storage <id> [--project <id>] [--dry-run] [--multi-path] [--metadata <excel>]
allowed-tools: ["Bash", "Read", "Glob", "Grep", "AskUserQuestion"]
---

# Synapse Upload Command

You will help the user upload files to a Synapse data collection. Sources can be local filesystem paths, S3 buckets, GCS buckets, SFTP servers, or storage-relative paths. You are an AI assistant — write temporary Python snippets as needed to inspect, validate, and orchestrate the upload. Be flexible and adaptive.

## Interactive-First Design

**IMPORTANT**: This command is designed to be fully interactive. Users may invoke it with no arguments at all — just `/synapse-upload:upload`. When this happens, guide them step-by-step through the entire process using `AskUserQuestion`. Never fail or dump usage text when arguments are missing. Instead, ask for each piece of information conversationally.

The user can also provide all arguments upfront to skip the interactive flow. Any combination works — ask only for what's missing.

## Arguments (all optional — will be asked interactively if missing)

- `<path>`: Source path — local (`/data/scans`), S3 (`s3://bucket/prefix`), GCS (`gs://bucket/prefix`), SFTP (`sftp://host/path`), or storage-relative (`subdir/`)
- `--data-collection <id>`: Data collection ID
- `--storage <id>`: Storage ID
- `--project <id>`: Project ID for task creation
- `--dry-run`: Preview the upload plan without executing
- `--batch-size <n>`: Data unit creation batch size (default: 50 for large datasets, 1 for small)
- `--multi-path`: Enable multi-path mode — each spec gets its own source path
- `--metadata <path>`: Path to Excel metadata file (`.xlsx` or `.xls`)
- `--assets '<json>'`: JSON mapping of spec names to source paths for multi-path mode

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

This checks:
- **Config file exists** — `~/.synapse/config.json` present and valid
- **CLI authentication** — configured host and access token
- **Token validity** — token is not expired
- **Agent configuration** — agent is set up

If `synapse doctor` reports issues:
| Doctor Check | Fix |
|-------------|-----|
| Config file missing | Run `synapse login` to authenticate |
| CLI authentication failed | Run `synapse login` or set `SYNAPSE_HOST` + `SYNAPSE_ACCESS_TOKEN` |
| Token invalid/expired | Run `synapse login` to re-authenticate |
| Agent not configured | Run `synapse agent init` or configure manually |

**Do not proceed until `synapse doctor` shows authentication and token checks passing.** MCP warnings are non-blocking for uploads.

### Step 2: Gather Parameters (Interactive Wizard)

Parse any arguments provided. For **every missing required parameter**, use `AskUserQuestion` to ask the user. Walk through them in a logical order:

**Step 2a: Data Collection** — Ask first because this determines what file specs we need.
```
"Which data collection should receive the files?"
Options:
  - "I know the ID" → ask for the integer ID
  - "Help me find it" → use the SDK to list recent data collections and let user pick
```

If the user says "help me find it", list their data collections:
```python
python3 -c "
from synapse_sdk.clients.backend import BackendClient
import json, os
config_path = os.path.expanduser('~/.synapse/config.json')
with open(config_path) as f:
    cfg = json.load(f)
client = BackendClient(
    base_url=cfg['host'],
    access_token=cfg['access_token'],
)
dcs = client.list_data_collections()
for dc in dcs.get('results', [])[:20]:
    print(f\"  ID {dc['id']}: {dc.get('name', 'Unnamed')}\")
"
```

Then ask the user to pick one.

**Step 2b: Storage** — Ask which storage to upload to.
```
"Which storage should the files be uploaded to?"
Options:
  - "I know the ID" → ask for the integer ID
  - "Help me find it" → show default storage via `client.get_default_storage()`, or ask for specific ID
```

**Step 2c: Source Path** — Ask where the files are.
```
"Where are the source files located?"
Options:
  - "Local filesystem" → ask for the path, validate with ls
  - "S3 bucket" → ask for s3:// URI
  - "Google Cloud Storage" → ask for gs:// URI
  - "Other" → free text input
```

After getting the path, **immediately validate it** (see path validation below). If invalid, report the error and ask again.

**Step 2d: Upload Mode** — After fetching specs (Step 4), if data is split:
```
"Are all files in the same directory, or split across different locations?"
Options:
  - "Same directory (single-path)" → proceed with the path from 2c
  - "Different locations per file type (multi-path)" → ask for each spec's path
```

If multi-path, ask for each spec's path individually:
```
"Where are the files for spec 'image_1' (.png, .jpg)?"
"Where are the files for spec 'label_1' (.json)?"
```

**Step 2e: Optional Parameters** — After the required params are gathered:
```
"Any additional options?"
Options:
  - "Upload with Excel metadata" → ask for the Excel file path
  - "Set data unit metadata" → ask what metadata to attach (if no Excel; see Step 4 for schema)
  - "Assign to a project" → ask for the project ID
  - "Just upload" → proceed with defaults
```

**Note on data unit metadata**: After fetching the data collection in Step 4, if a `data_unit_meta_schema` exists, **proactively inform the user** about the required metadata fields and ask how they want to provide the data (Excel, filename parsing, manual input, etc.). Don't wait for them to discover the validation error at upload time.

**Step 2f: Detect the source path type** by inspecting the scheme:

| Path Pattern | Type | Exploration Method |
|-------------|------|-------------------|
| `/abs/path` or `./rel` or `~/home` | Local filesystem | Glob, Bash `ls`/`find` |
| `s3://bucket/prefix` | Amazon S3 / MinIO | Python with `UPath` or `boto3` |
| `gs://bucket/prefix` | Google Cloud Storage | Python with `UPath` or `gcsfs` |
| `sftp://host/path` | SFTP | Python with `UPath` |
| No scheme, no leading `/` | Storage-relative | Resolve via `get_pathlib(storage, path)` |

**Pre-flight validation** — before exploring, verify the path is reachable:

```python
# For local paths:
from pathlib import Path
p = Path("<path>")
assert p.exists() and p.is_dir(), f"Path not found: {p}"

# For cloud/remote paths — use SDK's storage utility:
from synapse_sdk.utils.storage import get_pathlib
path_obj = get_pathlib({"provider": "<provider>", "configuration": {<config>}}, "<path>")
# Or resolve via the storage associated with the upload:
storage = client.get_storage(<storage_id>)
path_obj = get_pathlib({"provider": storage["provider"], "configuration": storage["configuration"]}, "<path>")
assert path_obj.exists(), f"Remote path not accessible: {path_obj}"
```

For storage-relative paths (no scheme), resolve through the storage config to get a `UPath` or `Path` object, then validate.

### Step 3: Detect Upload Mode

**Single-path mode** (default): One source path, all specs share it.
- User provides `<path>` argument
- Set `use_single_path: true` in params

**Multi-path mode** (`--multi-path` or `--assets`): Each spec has its own source path.
- User provides `--assets '{"image_1": "/data/images", "label_1": "/data/labels"}'`
- Or: ask the user interactively for each spec's path after fetching specs
- Set `use_single_path: false`, `assets: {spec_name: {path: "...", is_recursive: true}}` in params
- **Each asset path must be validated independently** — they can be different types (one local, one S3)

### Step 4: Fetch Data Collection Specs & Meta Schema

```bash
python3 -c "
from synapse_sdk.clients.backend import BackendClient
import json, os
config_path = os.path.expanduser('~/.synapse/config.json')
with open(config_path) as f:
    cfg = json.load(f)
client = BackendClient(
    base_url=cfg['host'],
    access_token=cfg['access_token'],
)
dc = client.get_data_collection(<DATA_COLLECTION_ID>)
meta_schema = dc.get('meta', {}).get('data_unit_meta_schema')
print(json.dumps({
    'name': dc.get('name', ''),
    'file_specifications': dc.get('file_specifications', []),
    'data_unit_meta_schema': meta_schema,
}, indent=2, default=str))
"
```

Parse the response to understand each spec's `name`, `file_type`, `extensions`, and `is_required`.

**Check for `data_unit_meta_schema`**: If the collection has a meta schema, every data unit's `meta` **must** conform to it or creation will be rejected. Tell the user about the required/expected fields and determine where the metadata will come from:
- Excel file (`--metadata`)
- Directory/filename patterns
- Sidecar JSON/YAML files
- User-provided values

If there's no schema, populate `meta` with at least a descriptive `name` or grouping key for traceability.

### Step 5: Explore Source

**Choose exploration method based on path type:**

#### Local filesystem
```bash
ls -la <path>
find <path> -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -20
find <path> -maxdepth 1 -type d | wc -l
```

#### Cloud / remote paths (S3, GCS, SFTP, storage-relative)

Write a temporary Python script. The SDK's `get_pathlib()` returns a `UPath` object that supports `.iterdir()`, `.rglob()`, `.stat()`, etc. — same API as `pathlib.Path`:

```python
from synapse_sdk.utils.storage import get_pathlib
import json

storage_config = {"provider": "<provider>", "configuration": {<...>}}
root = get_pathlib(storage_config, "<path>")

# List top-level
entries = []
for item in root.iterdir():
    entries.append({"name": item.name, "is_dir": item.is_dir()})
print(json.dumps(entries[:50], indent=2))

# Count by extension
from collections import Counter
exts = Counter()
for f in root.rglob("*"):
    if f.is_file():
        exts[f.suffix.lower()] += 1
print(json.dumps(dict(exts.most_common(20))))
```

Alternatively, you can fetch the storage config from the backend and use that:

```python
storage = client.get_storage(<storage_id>)
storage_config = {"provider": storage["provider"], "configuration": storage["configuration"]}
root = get_pathlib(storage_config, "<user_path>")
```

#### Multi-path mode
Explore each asset path independently. Write a single script that iterates over all asset paths.

**For large datasets (1000+ files or 100+ subdirs):**
- Do NOT enumerate all files — sample 2-3 representative subdirectories
- Use glob patterns to estimate total counts

### Step 6: Plan File Mapping

Determine:

1. **Grouping strategy**: How files organize into data units
2. **File-to-spec mapping**: Which files match which spec (by extension/naming)
3. **Conversion needs**: Files needing format conversion
4. **Completeness**: Whether all required specs are satisfied
5. **Metadata**: If `--metadata` was provided, note it will be passed to the upload plugin

Present the plan:

```
## Upload Plan

**Mode**: Single-path / Multi-path
**Source**: /data/patient_scans (1,247 subdirectories) [local filesystem]
**Target**: Data Collection "CT Scan Dataset" (ID: 2973)
**Storage**: ID 11
**Metadata source**: meta.xlsx (245 rows)
**Meta schema**: Required fields: patient_id (string), age (integer)

### File Specifications
| Spec Name | Required | Allowed Extensions | Source Pattern | Source Path |
|-----------|----------|-------------------|----------------|-------------|
| image_1   | Yes      | .png, .jpg        | *.png (found)  | /data/patient_scans |
| label_1   | Yes      | .json             | *.json (found) | /data/patient_scans |

### Data Unit Metadata
- Schema enforced: Yes (patient_id required, age required)
- Source: meta.xlsx → matched by filename column
- Coverage: 245/1,247 rows (warn if mismatch)

### Grouping
- Pattern: Each subdirectory = one data unit
- Data units to create: ~1,247
- Conversion needed: None

Proceed with upload? [Yes / Dry-run details / Adjust mapping / Cancel]
```

If `data_unit_meta_schema` exists, always show the metadata section in the plan. Warn the user if metadata coverage is incomplete (e.g., Excel has fewer rows than data units).

For multi-path mode, show each spec's source path separately.

If `--dry-run` was specified, stop here.

### Step 7: Execute Upload

Write a dataset-specific Python upload script and submit it to the agent's Ray cluster via `synapse script submit`. The script uses `BackendClient` directly — credentials (`SYNAPSE_HOST`, `SYNAPSE_ACCESS_TOKEN`) are auto-injected by the executor.

#### Write the upload script

Save to `/tmp/synapse_upload_<name>.py`. The script should:
1. Walk the source directory and group files into data units
2. Upload files via `client.upload_files_bulk()`
3. Create data units via `client.create_data_units()`

**Template — single-path mode:**
```python
#!/usr/bin/env python3
"""Upload <DESCRIPTIVE_NAME> to data collection <DC_ID>."""
import os
from pathlib import Path
from synapse_sdk.clients.backend import BackendClient

client = BackendClient(
    base_url=os.environ['SYNAPSE_HOST'],
    access_token=os.environ['SYNAPSE_ACCESS_TOKEN'],
)

DATA_COLLECTION_ID = <data_collection_id>
STORAGE_ID = <storage_id>
SOURCE_PATH = Path('<source_path>')
BATCH_SIZE = 50

# Fetch data collection specs
dc = client.get_data_collection(DATA_COLLECTION_ID)
specs = dc['file_specifications']
spec_by_ext = {}  # extension -> spec name
for spec in specs:
    for ext in spec.get('extensions', []):
        spec_by_ext[ext.lower()] = spec['name']

print(f"Data collection: {dc.get('name', '')} (ID {DATA_COLLECTION_ID})")
print(f"Specs: {[s['name'] for s in specs]}")
print(f"Source: {SOURCE_PATH}")

# Group files into data units (adapt this logic to the dataset structure)
data_units = {}  # group_key -> {spec_name: file_path}
for subdir in sorted(SOURCE_PATH.iterdir()):
    if not subdir.is_dir():
        continue
    group_key = subdir.name
    files = {}
    for f in subdir.iterdir():
        if f.is_file() and f.suffix.lower() in spec_by_ext:
            files[spec_by_ext[f.suffix.lower()]] = f
    if files:
        data_units[group_key] = files

print(f"Found {len(data_units)} data units")

# Upload files in bulk
all_files = [f for files in data_units.values() for f in files.values()]
print(f"Uploading {len(all_files)} files...")
upload_result = client.upload_files_bulk(all_files, max_workers=32)
print(f"Uploaded: {upload_result.created_count}, Failed: {upload_result.failed_count}")

# Build checksum lookup from upload results
checksum_by_path = {}
for r in upload_result.results:
    if r.success and r.file_path:
        checksum_by_path[str(r.file_path)] = {'id': r.data_file_id, 'checksum': r.checksum}

# Build metadata lookup (adapt source: Excel, filenames, sidecar files, etc.)
# Example A: from Excel
# import openpyxl
# wb = openpyxl.load_workbook('/path/to/meta.xlsx', read_only=True)
# ws = wb.active
# headers = [c.value for c in ws[1]]
# metadata_by_key = {}
# for row in ws.iter_rows(min_row=2, values_only=True):
#     row_dict = dict(zip(headers, row))
#     key = row_dict.pop('filename', row_dict.get('name', ''))
#     metadata_by_key[key] = row_dict

# Example B: minimal — just use directory name
metadata_by_key = {}  # group_key -> {field: value}

# Create data units in batches
# NOTE: If the data collection has a data_unit_meta_schema, meta MUST
# conform to it. Check dc['meta'].get('data_unit_meta_schema') and
# populate the required fields accordingly.
batch = []
created = 0
for group_key, files in data_units.items():
    du_files = {}
    for spec_name, file_path in files.items():
        info = checksum_by_path.get(str(file_path))
        if info:
            du_files[spec_name] = {'checksum': info['checksum'], 'path': str(file_path.name)}
    if du_files:
        meta = {'name': group_key}
        meta.update(metadata_by_key.get(group_key, {}))
        batch.append({
            'data_collection': DATA_COLLECTION_ID,
            'files': du_files,
            'meta': meta,
        })
    if len(batch) >= BATCH_SIZE:
        client.create_data_units(batch)
        created += len(batch)
        print(f"Created {created} data units...")
        batch = []

if batch:
    client.create_data_units(batch)
    created += len(batch)

print(f"\nDone! Created {created} data units, uploaded {len(all_files)} files.")
```

**IMPORTANT**: Adapt the file grouping logic to the actual dataset structure discovered in Steps 5-6. The template above assumes Pattern 1 (nested subdirectories). For other patterns, adjust accordingly:
- **Flat directory**: Group by filename stem (`Path(f).stem`)
- **Type-separated dirs**: Match files across directories by stem
- **Multi-path mode**: Iterate each asset path independently, match by stem across paths

#### Submit the script

```bash
synapse script submit /tmp/synapse_upload_<name>.py
```

Options:
- `--gpus <n>`: Request GPUs (rarely needed for upload)
- `--cpus <n>`: Request CPUs
- `-r <requirements.txt>`: Additional pip requirements

The script runs on the agent's Ray cluster with:
- Storage mount access
- Auto-injected `SYNAPSE_HOST` and `SYNAPSE_ACCESS_TOKEN`

### Step 8: Report Job Submission

Once the job is submitted, print the job ID and tell the user how to monitor:

```
## Job Submitted

- Job ID: <job-id>
- Script: /tmp/synapse_upload_<name>.py

### Monitor Progress
  synapse script logs <job-id> --follow

### Check Status Later
  synapse script logs <job-id>
```

## Error Handling

| Error | Action |
|-------|--------|
| Local path not found | Ask user to verify the path |
| S3/GCS access denied | Check credentials (AWS_ACCESS_KEY_ID, GOOGLE_APPLICATION_CREDENTIALS) |
| SFTP connection failed | Check host, port, credentials |
| Storage-relative path not found | Verify storage config and path spelling |
| synapse CLI not found | Look for `*venv*` in cwd and activate; otherwise guide: `uv pip install "synapse-sdk[all]>=2026.1.39"` |
| Missing authentication | Guide: `synapse login`, then verify with `synapse doctor` |
| Data collection not found | Ask user to verify the ID |
| File spec mismatch | Show which files don't match, suggest adjustments or conversion |
| Multi-path asset missing | Ask user which path to use for the spec |
| Excel metadata not found | Verify path; check if it's relative to storage or cwd |
| Upload timeout | Ensure using `--mode job` for production uploads |
| Partial failure | Report failed items, offer to retry |

## Large Dataset Guidelines

For datasets with 10,000+ files:

1. **Never enumerate all files** — sample 2-3 representative subdirs, then use patterns
2. **Use organize_files_by_pattern** — glob patterns + grouping regex
3. **Set batch size high** — `creating_data_unit_batch_size=50` or higher
4. **Use job mode** — for long-running uploads to avoid CLI timeouts
5. **Tell user how to monitor** — `synapse script logs <job-id> --follow`

## Flexibility Note

You are an AI assistant with full access to Bash and Python. If the standard workflow doesn't fit the user's data layout, **adapt**. Write temporary scripts to:
- Restructure directories before upload
- Parse custom metadata formats (CSV, TSV, YAML) into the expected structure
- Pre-convert files in bulk
- Validate cloud credentials before starting
- Handle mixed source types (some local, some S3) in multi-path mode

The upload plugin handles the heavy lifting (presigned URLs, parallel workers, data unit creation). Your job is to get the data *organized and validated* before handing it off.
