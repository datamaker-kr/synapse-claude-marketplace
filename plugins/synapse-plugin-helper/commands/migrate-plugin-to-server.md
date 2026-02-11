---
description: Migrate plugins and their latest releases from one Synapse server to another
argument-hint: [--source-host <url>] [--source-token <token>] [--dest-host <url>] [--dest-token <token>] [--plugins "name1, name2"]
allowed-tools: ["Bash", "Read", "AskUserQuestion", "Task"]
---

# Migrate Plugins to Server

Migrate Synapse plugins (definitions + latest releases) from a source server to a destination server.

**Arguments:** $ARGUMENTS

## Prerequisites

```bash
# Check synapse CLI
synapse --version 2>/dev/null || echo "ERROR: synapse-sdk not installed"
```

If synapse-sdk not installed:
```
synapse-sdk가 설치되어 있지 않습니다.
설치: uv pip install synapse-sdk (또는 pip install synapse-sdk)
```

## Workflow

### Step 1: Gather Connection Info

Collect source and destination server details from arguments or by asking the user.

- **Source server**: host URL and access token
- **Destination server**: host URL and access token
- **Plugin names**: comma-separated list of plugin names to migrate

If arguments are not provided, check `~/.synapse/config.json` for source defaults:
```bash
cat ~/.synapse/config.json
```

Ask the user for any missing values:
```
Source host (e.g. https://api.staging.synapse.sh):
Source access token:
Destination host (e.g. http://192.168.14.134:3000/api/):
Destination access token:
Plugin names to migrate:
```

### Step 2: Fetch Plugins from Source

List all plugins on the source server and match against user-provided names:

```bash
curl -s "<source_host>/plugins/?page_size=100" \
  -H "Synapse-Access-Token: Token <source_token>"
```

Match each user-provided plugin name against the `name` field (case-insensitive).

Display the matched plugins:
```
╔══════════════════════════════════════════════════════════════════════════╗
║                     SOURCE PLUGINS FOUND                               ║
╠════╦══════════════════════════════╦════════════════════╦════════════════╣
║ PK ║ Name                         ║ Code               ║ Category       ║
╠════╬══════════════════════════════╬════════════════════╬════════════════╣
║ 56 ║ 일반 데이터 임포트 플러그인    ║ dm-data-unit-...   ║ upload         ║
║ 35 ║ Pre Annotation To Task       ║ pre-annotation-... ║ pre_annotation ║
╚════╩══════════════════════════════╩════════════════════╩════════════════╝
```

If any plugin name is not found, warn the user and ask whether to continue with the found ones or abort.

### Step 3: Ask for Global Field Overrides

Show the fields that will be copied from source for each plugin:
- `name`, `code`, `category`, `description`
- `is_public`, `is_active`, `system_only`
- `detail`

Ask the user **once** if they want to override any fields globally across all plugins:
```
다음 필드가 소스 서버에서 그대로 복사됩니다:
  name, code, category, description, is_public, is_active, system_only, detail

전체 플러그인에 일괄 적용할 필드 오버라이드가 있습니까?
(예: is_public=true, system_only=false 등)
없으면 Enter를 눌러 그대로 진행합니다.
```

Apply any overrides to the plugin field map before proceeding.

### Step 4: Download Latest Releases from Source

For each matched plugin, fetch its latest release:

```bash
curl -s "<source_host>/plugin_releases/?plugin=<PK>" \
  -H "Synapse-Access-Token: Token <source_token>"
```

The first result is the latest release. Download the `file` field (presigned S3 URL, no extra auth needed):

```bash
mkdir -p /tmp/migrate-plugins/<plugin-code>
curl -s -o /tmp/migrate-plugins/<plugin-code>.zip "<file_url>"
unzip -o /tmp/migrate-plugins/<plugin-code>.zip -d /tmp/migrate-plugins/<plugin-code>/
```

If a plugin has no releases, report it and skip release publishing for that plugin:
```
WARNING: <plugin-name> has no releases on source. Skipping release migration.
```

**Run downloads in parallel** for efficiency when there are multiple plugins.

### Step 5: Create Plugins on Destination

For each plugin, create it on the destination server using Python (to handle Unicode correctly):

```python
import json, urllib.request

url = '<destination_host>/plugins/'
headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Synapse-Access-Token': 'Token <destination_token>'
}
body = {
    'name': '<name>',
    'code': '<code>',
    'category': '<category>',
    'description': '<description>',
    'is_public': <is_public>,
    'is_active': <is_active>,
    'system_only': <system_only>,
    'detail': {}
}
```

**Handling special cases:**

- **Plugin code already exists** (400 with "코드은/는 이미 존재합니다"): Skip creation, proceed to release publishing.
- **system_only=True plugins**: Try the regular API first. If it fails with 400, fallback to backoffice API:
  ```
  POST <destination_host>/backoffice/plugins/
  Body: { tenant: null, system_only: true, is_public: true, ... }
  ```
  The DB constraint requires: `system_only=True` -> `tenant=null` + `is_public=true`.

### Step 6: Publish Releases to Destination

For each plugin with a downloaded release, use the Synapse CLI:

```bash
synapse plugin publish --debug --yes \
  --host "<destination_host>" \
  --token "<destination_token>" \
  -p /tmp/migrate-plugins/<plugin-code>/
```

**Run publishes in parallel** when there are multiple plugins.

Report success or failure for each plugin.

### Step 7: Detect Inference Actions & Ask About Deployment

After publishing, check each migrated plugin's `config.yaml` for inference-type actions:

```bash
cat /tmp/migrate-plugins/<plugin-code>/config.yaml
```

Look for:
- Actions with `method: serve`
- Plugin category `neural_net`
- Any action names containing `inference` or `serve`

If detected, ask the user:
```
Plugin "<name>"에 inference 액션이 감지되었습니다.
대상 서버의 Ray Serve에 배포하시겠습니까? [y/N]
```

If yes:
- This requires an Agent on the destination server
- Create a Job + ServeApplication via `POST <destination_host>/serve_applications/`
- Note: this may require additional params (agent ID, job params) that need to be gathered from the user

If no or not applicable, skip and note "N/A" in the summary.

### Step 8: Summary

Display the final migration results:

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                              MIGRATION COMPLETE                                     ║
╠════╦══════════════════════════════════╦══════════╦══════════╦═════════╦══════════════╣
║ #  ║ Plugin                           ║ Src PK   ║ Dest PK  ║ Release ║ Deploy       ║
╠════╬══════════════════════════════════╬══════════╬══════════╬═════════╬══════════════╣
║  1 ║ 일반 데이터 임포트 플러그인       ║ 56       ║ 7        ║ OK      ║ N/A          ║
║  2 ║ Pre Annotation To Task           ║ 35       ║ 12       ║ OK      ║ N/A          ║
╚════╩══════════════════════════════════╩══════════╩══════════╩═════════╩══════════════╝
```

Clean up temp files:
```bash
rm -rf /tmp/migrate-plugins/
```

## Error Handling

### Source server unreachable
```
Connection refused: <source_host>
소스 서버에 연결할 수 없습니다. 호스트 URL을 확인해 주세요.
```

### Authentication failure
```
HTTP 401 Unauthorized
액세스 토큰이 유효하지 않습니다. 토큰을 확인해 주세요.
```

### Plugin name not found
```
WARNING: "<plugin_name>" not found on source server.
소스 서버에서 해당 플러그인을 찾을 수 없습니다.
```

### Plugin code already exists on destination
```
INFO: "<code>" already exists on destination (PK=<id>). Skipping creation.
```
This is not an error -- proceed to release publishing.

### Release download failure
```
Failed to download release for "<plugin_name>".
소스 서버에서 릴리즈 파일을 다운로드할 수 없습니다. presigned URL이 만료되었을 수 있습니다.
```

### synapse CLI not installed
```
synapse-sdk가 설치되어 있지 않습니다.
설치: uv pip install synapse-sdk (또는 pip install synapse-sdk)
```

### Publish version conflict
```
Version <version> already exists for <code>.
--debug 플래그를 사용하므로 기존 릴리즈가 업데이트됩니다.
```

### Backoffice API fallback for system_only plugins
```
INFO: Regular API failed for system_only plugin "<name>". Trying backoffice API...
```

## Examples

```bash
# Full arguments
/synapse-plugin-helper:migrate-plugin-to-server \
  --source-host https://api.staging.synapse.sh \
  --source-token syn_xxxxx \
  --dest-host http://192.168.14.134:3000/api/ \
  --dest-token syn_yyyyy \
  --plugins "일반 데이터 임포트 플러그인, avi/mov-to-mp4, Pre Annotation To Task"

# Interactive (no arguments -- will prompt for everything)
/synapse-plugin-helper:migrate-plugin-to-server

# Use ~/.synapse/config.json as source defaults
/synapse-plugin-helper:migrate-plugin-to-server \
  --dest-host http://192.168.14.134:3000/api/ \
  --dest-token syn_yyyyy
```
