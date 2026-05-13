#!/usr/bin/env python3
"""
dm_schema JSON 검증 스크립트

시계열 어노테이터가 기대하는 dm_schema 형식에 맞는지 검증하고,
위반 사항이 있으면 원인과 해결 방법을 안내합니다.

사용법:
    python validate_dm_schema.py output.json
    python validate_dm_schema.py --dir ./json_output/   # 일괄 검증

필수 패키지:
    추가 패키지 불필요 (json, pathlib 등 표준 라이브러리만 사용)
"""

import argparse
import json
import sys
from pathlib import Path


class ValidationError:
    def __init__(self, path: str, message: str, hint: str = ""):
        self.path = path
        self.message = message
        self.hint = hint

    def __str__(self):
        result = f"  ✗ [{self.path}] {self.message}"
        if self.hint:
            result += f"\n    → {self.hint}"
        return result


def validate(data: dict) -> list[ValidationError]:
    """dm_schema JSON을 검증하고 오류 목록을 반환합니다."""
    errors: list[ValidationError] = []

    # ── schemaVersion ──────────────────────────────────────
    if "schemaVersion" not in data:
        errors.append(ValidationError(
            "schemaVersion",
            "필수 키 'schemaVersion'이 없습니다.",
            "최상위에 \"schemaVersion\": \"1.0\" 을 추가하세요."
        ))
    elif not isinstance(data["schemaVersion"], str):
        errors.append(ValidationError(
            "schemaVersion",
            f"문자열이어야 합니다 (현재: {type(data['schemaVersion']).__name__})",
        ))

    # ── meta ──────────────────────────────────────────────
    if "meta" not in data:
        errors.append(ValidationError("meta", "필수 키 'meta'가 없습니다."))
        return errors  # meta 없으면 이후 검증 불가

    meta = data["meta"]
    meta_required = {
        "startTime": (int, float),
        "endTime": (int, float),
        "duration": (int, float),
        "nSamples": (int,),
        "sampleRate": (int, float),
    }
    for key, types in meta_required.items():
        if key not in meta:
            errors.append(ValidationError(
                f"meta.{key}",
                f"필수 필드 '{key}'가 없습니다.",
                f"meta 객체에 {key} 값을 추가하세요."
            ))
        elif not isinstance(meta[key], types):
            errors.append(ValidationError(
                f"meta.{key}",
                f"타입 오류: {type(meta[key]).__name__} (기대: {'/'.join(t.__name__ for t in types)})",
            ))

    # meta.timeAxis
    if "timeAxis" not in meta:
        errors.append(ValidationError(
            "meta.timeAxis",
            "필수 객체 'timeAxis'가 없습니다.",
            "meta.timeAxis = { origin: 'absolute', format: 'HH:mm:ss' } 형태로 추가하세요."
        ))
    else:
        ta = meta["timeAxis"]
        if "origin" not in ta:
            errors.append(ValidationError(
                "meta.timeAxis.origin",
                "'origin'이 없습니다.",
                "허용 값: 'absolute', 'relative', 'boot'"
            ))
        elif ta["origin"] not in ("absolute", "relative", "boot"):
            errors.append(ValidationError(
                "meta.timeAxis.origin",
                f"잘못된 origin 값: '{ta['origin']}'",
                "허용 값: 'absolute' (권장), 'relative', 'boot'"
            ))
        if "format" not in ta:
            errors.append(ValidationError(
                "meta.timeAxis.format",
                "'format'이 없습니다.",
                "Day.js 포맷 문자열을 지정하세요. 예: 'HH:mm:ss'"
            ))

    # meta 정합성 검사
    if all(k in meta for k in ("startTime", "endTime", "duration", "nSamples", "sampleRate")):
        expected_duration = (meta["endTime"] - meta["startTime"]) / 1000.0
        if abs(expected_duration - meta["duration"]) > 1.0:
            errors.append(ValidationError(
                "meta.duration",
                f"duration({meta['duration']}s)이 startTime/endTime 차이({expected_duration:.1f}s)와 불일치합니다.",
                "duration = (endTime - startTime) / 1000 이어야 합니다."
            ))

    # ── timestamps ────────────────────────────────────────
    if "timestamps" not in data:
        errors.append(ValidationError("timestamps", "필수 키 'timestamps'가 없습니다."))
    elif not isinstance(data["timestamps"], list):
        errors.append(ValidationError("timestamps", f"배열이어야 합니다 (현재: {type(data['timestamps']).__name__})"))
    else:
        ts = data["timestamps"]
        if len(ts) == 0:
            errors.append(ValidationError("timestamps", "빈 배열입니다."))
        else:
            # nSamples 일치
            if "nSamples" in meta and len(ts) != meta["nSamples"]:
                errors.append(ValidationError(
                    "timestamps",
                    f"길이({len(ts)})가 meta.nSamples({meta['nSamples']})와 불일치합니다.",
                ))
            # startTime/endTime 일치
            if "startTime" in meta and ts[0] != meta["startTime"]:
                errors.append(ValidationError(
                    "timestamps[0]",
                    f"첫 값({ts[0]})이 meta.startTime({meta['startTime']})과 불일치합니다.",
                ))
            if "endTime" in meta and ts[-1] != meta["endTime"]:
                errors.append(ValidationError(
                    "timestamps[-1]",
                    f"마지막 값({ts[-1]})이 meta.endTime({meta['endTime']})과 불일치합니다.",
                ))
            # 단조증가 검사 (전체)
            for i in range(1, len(ts)):
                if ts[i] <= ts[i - 1]:
                    errors.append(ValidationError(
                        f"timestamps[{i}]",
                        f"단조증가 위반: [{i-1}]={ts[i-1]} >= [{i}]={ts[i]}",
                        "timestamps는 항상 오름차순이어야 합니다."
                    ))
                    break

    # ── tracks ────────────────────────────────────────────
    all_track_channel_ids = set()

    if "tracks" not in data:
        errors.append(ValidationError("tracks", "필수 키 'tracks'가 없습니다."))
    elif not isinstance(data["tracks"], list):
        errors.append(ValidationError("tracks", f"배열이어야 합니다 (현재: {type(data['tracks']).__name__})"))
    elif len(data["tracks"]) == 0:
        errors.append(ValidationError("tracks", "빈 배열입니다. 최소 1개의 트랙이 필요합니다."))
    else:
        valid_chart_types = {"line", "scatter", "psd", "fft"}

        for i, track in enumerate(data["tracks"]):
            prefix = f"tracks[{i}]"
            for key in ("id", "name", "chartType", "channels"):
                if key not in track:
                    errors.append(ValidationError(f"{prefix}.{key}", f"필수 필드 '{key}'가 없습니다."))

            if "chartType" in track and track["chartType"] not in valid_chart_types:
                errors.append(ValidationError(
                    f"{prefix}.chartType",
                    f"잘못된 chartType: '{track['chartType']}'",
                    f"허용 값: {', '.join(sorted(valid_chart_types))}"
                ))

            if "channels" in track:
                if not isinstance(track["channels"], list) or len(track["channels"]) == 0:
                    errors.append(ValidationError(f"{prefix}.channels", "비어있지 않은 문자열 배열이어야 합니다."))
                else:
                    for ch_id in track["channels"]:
                        all_track_channel_ids.add(ch_id)

            # yRange 검증 (선택)
            if "yRange" in track:
                yr = track["yRange"]
                if not isinstance(yr, dict) or "min" not in yr or "max" not in yr:
                    errors.append(ValidationError(f"{prefix}.yRange", "{ min: number, max: number } 형태여야 합니다."))

            # thresholds 검증 (선택)
            if "thresholds" in track:
                for j, th in enumerate(track["thresholds"]):
                    if "color" not in th:
                        errors.append(ValidationError(f"{prefix}.thresholds[{j}].color", "필수 필드 'color'가 없습니다."))

        # track.id 중복 검사
        track_ids = [t.get("id") for t in data["tracks"] if "id" in t]
        seen_ids = set()
        for tid in track_ids:
            if tid in seen_ids:
                errors.append(ValidationError(
                    f"tracks",
                    f"중복된 track.id: '{tid}'",
                    "각 트랙의 id는 고유해야 합니다."
                ))
            seen_ids.add(tid)

    # ── channels ──────────────────────────────────────────
    if "channels" not in data:
        errors.append(ValidationError("channels", "필수 키 'channels'가 없습니다."))
    elif not isinstance(data["channels"], dict):
        errors.append(ValidationError("channels", f"객체여야 합니다 (현재: {type(data['channels']).__name__})"))
    else:
        ts_len = len(data.get("timestamps", []))

        for ch_id, ch_values in data["channels"].items():
            if not isinstance(ch_values, list):
                errors.append(ValidationError(
                    f"channels.{ch_id}",
                    f"배열이어야 합니다 (현재: {type(ch_values).__name__})"
                ))
            elif ts_len > 0 and len(ch_values) != ts_len:
                errors.append(ValidationError(
                    f"channels.{ch_id}",
                    f"길이({len(ch_values)})가 timestamps 길이({ts_len})와 불일치합니다.",
                    "모든 채널의 값 배열은 timestamps와 동일한 길이여야 합니다."
                ))
            else:
                # NaN/Infinity 검사
                nan_count = sum(1 for v in ch_values if v is not None and isinstance(v, float) and (v != v or v == float('inf') or v == float('-inf')))
                if nan_count > 0:
                    errors.append(ValidationError(
                        f"channels.{ch_id}",
                        f"NaN 또는 Infinity 값 {nan_count}개 발견",
                        "데이터 공백이나 센서 오류 구간을 확인하세요."
                    ))

        # tracks에서 참조된 채널이 channels에 존재하는지
        if "tracks" in data and isinstance(data["tracks"], list):
            for ch_id in all_track_channel_ids:
                if ch_id not in data["channels"]:
                    errors.append(ValidationError(
                        f"channels.{ch_id}",
                        f"tracks에서 참조되지만 channels에 없습니다.",
                        f"channels 객체에 '{ch_id}' 키를 추가하세요."
                    ))

    # ── channelMeta ───────────────────────────────────────
    if "channelMeta" not in data:
        errors.append(ValidationError(
            "channelMeta",
            "필수 키 'channelMeta'가 없습니다.",
            "각 채널의 표시 정보(name, unit, color, chartType)를 담는 객체입니다."
        ))
    elif not isinstance(data["channelMeta"], dict):
        errors.append(ValidationError("channelMeta", f"객체여야 합니다 (현재: {type(data['channelMeta']).__name__})"))
    else:
        # channels에 있는 모든 키가 channelMeta에도 있는지
        if "channels" in data and isinstance(data["channels"], dict):
            for ch_id in data["channels"]:
                if ch_id not in data["channelMeta"]:
                    errors.append(ValidationError(
                        f"channelMeta.{ch_id}",
                        f"channels에 존재하지만 channelMeta에 없습니다.",
                        f"channelMeta에 '{ch_id}': {{ name, unit, color, chartType }} 을 추가하세요."
                    ))

        # channelMeta 각 항목 검증
        for ch_id, cm in data["channelMeta"].items():
            if not isinstance(cm, dict):
                errors.append(ValidationError(f"channelMeta.{ch_id}", "객체여야 합니다."))
                continue
            for key in ("name", "unit", "color", "chartType"):
                if key not in cm:
                    errors.append(ValidationError(
                        f"channelMeta.{ch_id}.{key}",
                        f"필수 필드 '{key}'가 없습니다."
                    ))

    return errors


def validate_file(filepath: str) -> bool:
    """파일을 읽어 검증하고 결과를 출력합니다. 성공 시 True."""
    path = Path(filepath)
    print(f"\n{'='*60}")
    print(f"검증: {path.name}")
    print(f"{'='*60}")

    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"  ✗ JSON 파싱 오류: {e}")
        return False
    except FileNotFoundError:
        print(f"  ✗ 파일을 찾을 수 없습니다: {filepath}")
        return False

    errors = validate(data)

    if not errors:
        # 요약 정보 출력
        meta = data.get("meta", {})
        tracks = data.get("tracks", [])
        channels = data.get("channels", {})
        print(f"  ✓ 검증 통과")
        print(f"    시간: {meta.get('duration', '?')}초")
        print(f"    샘플: {meta.get('nSamples', '?')}개 @ {meta.get('sampleRate', '?')}Hz")
        print(f"    트랙: {len(tracks)}개")
        print(f"    채널: {len(channels)}개")
        return True
    else:
        print(f"  ✗ {len(errors)}개 오류 발견:\n")
        for err in errors:
            print(err)
            print()
        return False


def main():
    parser = argparse.ArgumentParser(description="dm_schema JSON 검증")
    parser.add_argument("files", nargs="*", help="검증할 JSON 파일(들)")
    parser.add_argument("--dir", "-d", help="JSON 파일이 있는 디렉토리 (일괄 검증)")
    args = parser.parse_args()

    files = []
    if args.dir:
        files = sorted(Path(args.dir).glob("*.json"))
    elif args.files:
        files = [Path(f) for f in args.files]
    else:
        parser.error("검증할 JSON 파일 또는 --dir을 지정하세요.")

    if not files:
        print("검증할 파일이 없습니다.")
        return

    results = []
    for f in files:
        ok = validate_file(str(f))
        results.append((f.name, ok))

    if len(results) > 1:
        print(f"\n{'='*60}")
        print("요약")
        print(f"{'='*60}")
        passed = sum(1 for _, ok in results if ok)
        print(f"  통과: {passed}/{len(results)}")
        for name, ok in results:
            print(f"    {'✓' if ok else '✗'} {name}")

    sys.exit(0 if all(ok for _, ok in results) else 1)


if __name__ == "__main__":
    main()
