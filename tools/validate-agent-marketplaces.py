#!/usr/bin/env python3
"""Validate agent-neutral marketplace manifests and generated artifacts."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PLUGIN_ROOT = ROOT / "plugins"
ROOT_MANIFEST = ROOT / ".agent-marketplace.yaml"
SEMVER_RE = re.compile(
    r"^(0|[1-9]\d*)\."
    r"(0|[1-9]\d*)\."
    r"(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z.-]+)?"
    r"(?:\+[0-9A-Za-z.-]+)?$"
)


def main() -> None:
    errors: list[str] = []
    root_manifest = load_yaml(ROOT_MANIFEST, errors)
    if root_manifest is None:
        report(errors)

    plugins = load_plugin_manifests(root_manifest, errors)
    for plugin in plugins:
        validate_plugin_manifest(plugin, errors)
        validate_declared_paths(plugin, errors)
        validate_generated_codex(plugin, errors)
        validate_command_derived_skills(plugin, errors)
        validate_opencode_artifacts(plugin, errors)

    validate_generated_check(errors)
    report(errors)
    print("Agent marketplace validation passed.")


def load_plugin_manifests(
    root_manifest: dict[str, Any],
    errors: list[str],
) -> list[dict[str, Any]]:
    plugin_names = root_manifest.get("plugins")
    if not isinstance(plugin_names, list) or not plugin_names:
        errors.append(".agent-marketplace.yaml must contain a non-empty plugins list")
        return []

    plugins: list[dict[str, Any]] = []
    for name in plugin_names:
        if not isinstance(name, str) or not name:
            errors.append(".agent-marketplace.yaml plugin entries must be strings")
            continue
        path = PLUGIN_ROOT / name / "agent-plugin.yaml"
        plugin = load_yaml(path, errors)
        if plugin is None:
            continue
        plugin["_root"] = PLUGIN_ROOT / name
        plugin["_manifest_path"] = path
        plugins.append(plugin)
    return plugins


def validate_plugin_manifest(plugin: dict[str, Any], errors: list[str]) -> None:
    path = plugin["_manifest_path"]
    required_strings = (
        "name",
        "version",
        "description",
        "homepage",
        "repository",
        "license",
        "category",
    )
    for field in required_strings:
        value = plugin.get(field)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{relative(path)} field `{field}` must be a non-empty string")
    version = plugin.get("version")
    if isinstance(version, str) and SEMVER_RE.fullmatch(version) is None:
        errors.append(f"{relative(path)} field `version` must be semver")

    if plugin.get("name") != plugin["_root"].name:
        errors.append(f"{relative(path)} field `name` must match plugin directory name")

    author = plugin.get("author")
    if not isinstance(author, dict) or not isinstance(author.get("name"), str):
        errors.append(f"{relative(path)} field `author.name` must be present")

    for field in ("keywords", "tags", "commands", "skills", "agents"):
        value = plugin.get(field)
        if value is None:
            continue
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            errors.append(f"{relative(path)} field `{field}` must be an array of strings")

    interface = plugin.get("interface")
    if not isinstance(interface, dict):
        errors.append(f"{relative(path)} field `interface` must be an object")
        return
    for field in ("display_name", "short_description", "long_description", "default_prompt"):
        value = interface.get(field)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{relative(path)} field `interface.{field}` must be present")
    capabilities = interface.get("capabilities")
    if not isinstance(capabilities, list) or not all(isinstance(item, str) for item in capabilities):
        errors.append(f"{relative(path)} field `interface.capabilities` must be an array of strings")


def validate_declared_paths(plugin: dict[str, Any], errors: list[str]) -> None:
    plugin_root = plugin["_root"]
    for field in ("commands", "skills", "agents", "mcp_servers"):
        for raw_path in plugin.get(field) or []:
            path = plugin_root / strip_dot(raw_path)
            if not path.exists():
                errors.append(f"{relative(plugin['_manifest_path'])} declares missing {field} path `{raw_path}`")

    for raw_path in plugin.get("skills") or []:
        path = plugin_root / strip_dot(raw_path)
        validate_markdown_frontmatter(path, ("name", "description"), errors)

    for raw_path in plugin.get("commands") or []:
        path = plugin_root / strip_dot(raw_path)
        validate_markdown_frontmatter(path, ("description",), errors)


def validate_generated_codex(plugin: dict[str, Any], errors: list[str]) -> None:
    path = plugin["_root"] / ".codex-plugin" / "plugin.json"
    payload = load_json(path, errors)
    if payload is None:
        return
    allowed_keys = {
        "name",
        "version",
        "description",
        "author",
        "homepage",
        "repository",
        "license",
        "keywords",
        "skills",
        "interface",
    }
    for key in sorted(set(payload) - allowed_keys):
        errors.append(f"{relative(path)} field `{key}` is not valid for Codex plugin manifests")
    if payload.get("name") != plugin["name"]:
        errors.append(f"{relative(path)} name does not match agent-plugin.yaml")
    if payload.get("version") != plugin["version"]:
        errors.append(f"{relative(path)} version does not match agent-plugin.yaml")
    if payload.get("skills") != "./skills/":
        errors.append(f"{relative(path)} field `skills` must be `./skills/`")

    interface = payload.get("interface")
    if not isinstance(interface, dict):
        errors.append(f"{relative(path)} field `interface` must be an object")
        return
    for field in (
        "displayName",
        "shortDescription",
        "longDescription",
        "developerName",
        "category",
        "capabilities",
        "defaultPrompt",
    ):
        if field not in interface:
            errors.append(f"{relative(path)} field `interface.{field}` is required")


def validate_command_derived_skills(plugin: dict[str, Any], errors: list[str]) -> None:
    plugin_root = plugin["_root"]
    for raw_path in plugin.get("commands") or []:
        command_path = plugin_root / strip_dot(raw_path)
        skill_path = plugin_root / "skills" / f"{command_path.stem}-command" / "SKILL.md"
        validate_markdown_frontmatter(skill_path, ("name", "description"), errors)


def validate_opencode_artifacts(plugin: dict[str, Any], errors: list[str]) -> None:
    opencode_root = ROOT / "dist" / "opencode" / plugin["name"] / ".opencode"
    for raw_path in plugin.get("skills") or []:
        source = plugin["_root"] / strip_dot(raw_path)
        target = opencode_root / "skills" / source.parent.name / "SKILL.md"
        validate_markdown_frontmatter(target, ("name", "description"), errors)
    for raw_path in plugin.get("commands") or []:
        source = plugin["_root"] / strip_dot(raw_path)
        target = opencode_root / "commands" / source.name
        validate_markdown_frontmatter(target, ("description",), errors)
    for raw_path in plugin.get("agents") or []:
        source = plugin["_root"] / strip_dot(raw_path)
        name = f"{source.parent.name}.md" if source.name == "SKILL.md" else source.name
        target = opencode_root / "agent" / name
        validate_markdown_frontmatter(target, ("description",), errors)


def validate_markdown_frontmatter(path: Path, required_fields: tuple[str, ...], errors: list[str]) -> None:
    if not path.is_file():
        errors.append(f"missing markdown file: {relative(path)}")
        return
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        errors.append(f"{relative(path)} must start with YAML frontmatter")
        return
    end = text.find("\n---", 4)
    if end == -1:
        errors.append(f"{relative(path)} frontmatter is not closed")
        return
    try:
        payload = parse_yaml(text[4:end])
    except ValueError as exc:
        errors.append(f"{relative(path)} frontmatter is invalid YAML: {exc}")
        return
    if not isinstance(payload, dict):
        errors.append(f"{relative(path)} frontmatter must be an object")
        return
    for field in required_fields:
        value = payload.get(field)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{relative(path)} frontmatter field `{field}` must be present")


def validate_generated_check(errors: list[str]) -> None:
    result = subprocess.run(
        [sys.executable, "tools/generate-agent-marketplaces.py", "--check"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        errors.append(
            "generated artifacts are not up to date:\n"
            + result.stdout.strip()
            + ("\n" if result.stdout.strip() and result.stderr.strip() else "")
            + result.stderr.strip()
        )


def load_yaml(path: Path, errors: list[str]) -> dict[str, Any] | None:
    if not path.is_file():
        errors.append(f"missing YAML file: {relative(path)}")
        return None
    try:
        payload = parse_yaml(path.read_text(encoding="utf-8"))
    except ValueError as exc:
        errors.append(f"{relative(path)} is invalid YAML: {exc}")
        return None
    if not isinstance(payload, dict):
        errors.append(f"{relative(path)} must contain a YAML object")
        return None
    return payload


def load_json(path: Path, errors: list[str]) -> dict[str, Any] | None:
    if not path.is_file():
        errors.append(f"missing JSON file: {relative(path)}")
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{relative(path)} is invalid JSON: {exc}")
        return None
    if not isinstance(payload, dict):
        errors.append(f"{relative(path)} must contain a JSON object")
        return None
    return payload


def strip_dot(raw_path: str) -> Path:
    return Path(raw_path[2:] if raw_path.startswith("./") else raw_path)


def parse_yaml(text: str) -> Any:
    lines = preprocess_yaml_lines(text)
    if not lines:
        return {}
    value, index = parse_yaml_block(lines, 0, lines[0][0])
    if index != len(lines):
        raise ValueError("unexpected trailing YAML content")
    return value


def preprocess_yaml_lines(text: str) -> list[tuple[int, str]]:
    parsed: list[tuple[int, str]] = []
    for raw_line in text.splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue
        indent = len(raw_line) - len(raw_line.lstrip(" "))
        parsed.append((indent, raw_line.strip()))
    return parsed


def parse_yaml_block(
    lines: list[tuple[int, str]],
    index: int,
    indent: int,
) -> tuple[Any, int]:
    if index >= len(lines):
        return {}, index
    if lines[index][1].startswith("- "):
        values: list[Any] = []
        while index < len(lines) and lines[index][0] == indent and lines[index][1].startswith("- "):
            item = lines[index][1][2:].strip()
            if not item:
                nested, index = parse_yaml_block(lines, index + 1, indent + 2)
                values.append(nested)
            else:
                values.append(parse_yaml_scalar(item))
                index += 1
        return values, index

    payload: dict[str, Any] = {}
    while index < len(lines) and lines[index][0] == indent and not lines[index][1].startswith("- "):
        key, sep, raw_value = lines[index][1].partition(":")
        if not sep:
            raise ValueError(f"invalid YAML line: {lines[index][1]}")
        key = key.strip()
        raw_value = raw_value.strip()
        if raw_value in {">", "|"}:
            value, index = parse_yaml_block_scalar(lines, index + 1, indent)
            payload[key] = value
        elif raw_value:
            payload[key] = parse_yaml_scalar(raw_value)
            index += 1
        else:
            if index + 1 >= len(lines) or lines[index + 1][0] <= indent:
                payload[key] = {}
                index += 1
            else:
                value, index = parse_yaml_block(lines, index + 1, lines[index + 1][0])
                payload[key] = value
    return payload, index


def parse_yaml_block_scalar(
    lines: list[tuple[int, str]],
    index: int,
    parent_indent: int,
) -> tuple[str, int]:
    values: list[str] = []
    while index < len(lines) and lines[index][0] > parent_indent:
        values.append(lines[index][1])
        index += 1
    return " ".join(values).strip(), index


def parse_yaml_scalar(value: str) -> Any:
    if value == "[]":
        return []
    if value == "{}":
        return {}
    if value in {"true", "True"}:
        return True
    if value in {"false", "False"}:
        return False
    if value in {"null", "Null", "~"}:
        return None
    if value.startswith("[") and value.endswith("]"):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return [item.strip().strip("\"'") for item in value[1:-1].split(",") if item.strip()]
    if (value.startswith('"') and value.endswith('"')) or (
        value.startswith("'") and value.endswith("'")
    ):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value[1:-1]
    return value


def relative(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def report(errors: list[str]) -> None:
    if errors:
        print("Agent marketplace validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
