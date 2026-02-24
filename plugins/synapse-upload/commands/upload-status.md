---
description: Check status and logs of a Synapse upload job
argument-hint: <job-id> [--follow]
allowed-tools: ["Bash", "AskUserQuestion"]
---

# Upload Status Command

Check the status and logs of a running or completed Synapse upload job.

## Arguments

- `<job-id>` (required): The job ID returned from the upload command
- `--follow` (optional): Continuously stream logs until the job completes
- `--stop` (optional): Stop a running job

## Workflow

### Step 1: Parse Arguments

Extract the job ID from the command arguments. If no job ID is provided, ask the user.

### Step 2: Get Logs

```bash
# Recent logs
synapse script logs <job-id>

# Or stream continuously if --follow
synapse script logs <job-id> --follow

# Stop a running job
synapse script stop <job-id>
```

### Step 3: Display Status

Parse the log output to determine progress. Upload scripts print status lines like:
- `Uploading N files...`
- `Uploaded: N, Failed: N`
- `Created N data units...`
- `Done! Created N data units, uploaded N files.`

Present a clear summary:

```
## Job Status: <job-id>

- Status: Running
- Progress: 65% (812/1,247 data units)
- Duration: 8m 22s
```

Display the last relevant log entries. For `--follow` mode, stream until the job completes or the user interrupts.

### Step 5: Report Completion

If the job is complete, show the final summary:

**On success:**
```
## Job Complete: <job-id>

- Status: Completed
- Data units created: 1,247
- Files uploaded: 3,741
- Duration: 12m 34s
```

**On failure:**
```
## Job Failed: <job-id>

- Status: Failed
- Error: <error message>
- Progress at failure: 65% (812/1,247)
- Duration: 8m 22s

### Suggested Actions
- Check the logs for details: `synapse script logs <job-id>`
- Retry the upload: `/synapse-upload:upload ...`
```

## Error Handling

| Error | Action |
|-------|--------|
| Job not found | Ask user to verify the job ID |
| synapse CLI not available | Look for `*venv*` in cwd and activate; otherwise guide: `uv pip install "synapse-sdk[all]>=2026.1.39"` |
| Access denied | Run `synapse login` to re-authenticate, verify with `synapse doctor` |
