---
description: Check status and logs of a Synapse export job
argument-hint: <job-id> [--follow]
allowed-tools: ["Bash", "AskUserQuestion"]
---

# Export Status Command

Check the status and logs of a running or completed Synapse export job.

## Arguments

- `<job-id>` (required): The job ID returned from the export command
- `--follow` (optional): Continuously stream logs until the job completes

## Workflow

### Step 1: Parse Arguments

Extract the job ID from the command arguments. If no job ID is provided, ask the user.

### Step 2: Get Logs

```bash
# Recent logs
synapse script logs <job-id>

# Or stream continuously if --follow
synapse script logs <job-id> --follow
```

For plugin-based exports, use:
```bash
synapse plugin job get <job-id>
synapse plugin job logs <job-id> --follow
```

### Step 3: Display Status

Parse the log output to determine progress. Export scripts print status lines like:
- `Fetching assignments...`
- `Found N assignments`
- `Exported N/M...`
- `Done! Exported N assignments to /path`

Present a clear summary:

```
## Job Status: <job-id>

- Status: Running
- Progress: 65% (812/1,247 items)
- Duration: 3m 45s
```

### Step 4: Report Completion

**On success:**
```
## Export Complete: <job-id>

- Status: Completed
- Items exported: 1,247
- Format: COCO
- Output: /tmp/synapse_export_ct_detection/
- Duration: 5m 12s
```

**On failure:**
```
## Export Failed: <job-id>

- Status: Failed
- Error: <error message>
- Progress at failure: 65% (812/1,247)

### Suggested Actions
- Check the logs: `synapse script logs <job-id>`
- Retry: `/synapse-export:export ...`
```

## Error Handling

| Error | Action |
|-------|--------|
| Job not found | Ask user to verify the job ID |
| synapse CLI not available | Look for `*venv*` in cwd and activate; otherwise guide: `uv pip install "synapse-sdk>=2026.1.39"` |
| Access denied | Run `synapse login` to re-authenticate |
