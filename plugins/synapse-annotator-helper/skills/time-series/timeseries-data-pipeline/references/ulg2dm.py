#!/usr/bin/env python3
"""
ULG → dm_schema JSON 변환 스크립트

PX4 ULog 파일(.ulg)을 시계열 어노테이터가 사용하는 dm_schema JSON으로 변환합니다.

사용법:
    python ulg2dm.py --input log.ulg --config track-config.yaml --output output.json
    python ulg2dm.py --input-dir ./ulg_files/ --config track-config.yaml --output-dir ./json_output/
    python ulg2dm.py --input log.ulg --list-topics  # ULG 파일의 토픽/필드 목록 확인

필수 패키지:
    pip install pyulog pyyaml numpy
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import yaml
from pyulog import ULog


def list_topics(ulg_path: str) -> None:
    """ULG 파일에 포함된 모든 토픽과 필드를 출력합니다."""
    ulog = ULog(ulg_path)
    duration = (ulog.last_timestamp - ulog.start_timestamp) / 1e6

    print(f"파일: {ulg_path}")
    print(f"시간: {duration:.1f}초")
    print(f"토픽 수: {len(ulog.data_list)}")
    print()

    for d in sorted(ulog.data_list, key=lambda x: x.name):
        fields = [f.field_name for f in d.field_data if f.field_name != "timestamp"]
        n = d.data["timestamp"].shape[0]
        if n == 0:
            print(f"  {d.name}[{d.multi_id}] (0 samples, skipped)")
            continue
        ts = d.data["timestamp"]
        delta = (ts[-1] - ts[0]) / 1e6
        rate = n / delta if delta > 0 else 0
        print(f"  {d.name}[{d.multi_id}] ({n} samples, ~{rate:.1f}Hz)")
        for f in fields:
            print(f"    - {f}")
        print()


def find_topic_data(ulog: ULog, topic_name: str, multi_id: int = 0):
    """ULog에서 특정 토픽 데이터를 찾습니다."""
    for d in ulog.data_list:
        if d.name == topic_name and d.multi_id == multi_id:
            return d
    return None


def resample_to_grid(
    src_timestamps_us: np.ndarray,
    src_values: np.ndarray,
    target_timestamps_us: np.ndarray,
    scale: float = 1.0,
) -> list:
    """소스 데이터를 타겟 타임그리드에 맞게 리샘플링합니다.

    다운샘플링 비율이 2배 이상이면 이동 평균 필터를 적용하여 앨리어싱을 방지합니다.
    """
    values = src_values.copy()

    # 다운샘플링 비율 추정 및 앤티앨리어싱
    if len(src_timestamps_us) > 1 and len(target_timestamps_us) > 1:
        src_interval = np.median(np.diff(src_timestamps_us[:100]))
        tgt_interval = np.median(np.diff(target_timestamps_us[:100]))
        if src_interval > 0:
            ratio = tgt_interval / src_interval
            if ratio > 2:
                window = max(2, int(ratio))
                if window < len(values):
                    kernel = np.ones(window) / window
                    padded = np.pad(values, window // 2, mode="edge")
                    values = np.convolve(padded, kernel, mode="valid")

    resampled = np.interp(target_timestamps_us, src_timestamps_us, values)
    if scale != 1.0:
        resampled = resampled * scale
    return [round(float(v), 6) for v in resampled]


def build_target_timestamps(ulog: ULog, sample_rate: int) -> np.ndarray:
    """공통 타임그리드를 생성합니다 (마이크로초 단위)."""
    start_us = ulog.start_timestamp
    end_us = ulog.last_timestamp
    interval_us = int(1e6 / sample_rate)
    return np.arange(start_us, end_us, interval_us)


def us_to_epoch_ms(timestamp_us: int, utc_offset_us: int) -> int:
    """ULog 마이크로초 타임스탬프를 Unix epoch 밀리초로 변환합니다."""
    return round((timestamp_us + utc_offset_us) / 1000)


def get_utc_offset(ulog: ULog) -> int:
    """ULog의 UTC 오프셋을 마이크로초 단위로 반환합니다.

    GPS 3D fix 이상인 샘플의 중앙값을 사용하여 웜업 오차를 줄입니다.
    GPS가 없으면 0을 반환합니다 (boot 기준 상대 시간).
    """
    for topic_name in ("vehicle_gps_position", "sensor_gps"):
        gps_data = find_topic_data(ulog, topic_name)
        if gps_data is None or "time_utc_usec" not in gps_data.data:
            continue

        utc_times = gps_data.data["time_utc_usec"]
        boot_times = gps_data.data["timestamp"]
        has_fix = "fix_type" in gps_data.data

        offsets = []
        for i in range(len(utc_times)):
            if utc_times[i] <= 0:
                continue
            if has_fix and gps_data.data["fix_type"][i] < 3:
                continue
            offsets.append(int(utc_times[i] - boot_times[i]))
            if len(offsets) >= 10:
                break

        if offsets:
            return int(np.median(offsets))

    return 0


def convert(ulg_path: str, config_path: str, output_path: str) -> None:
    """ULG 파일을 dm_schema JSON으로 변환합니다."""
    # 설정 로드
    with open(config_path, encoding="utf-8") as f:
        config = yaml.safe_load(f)

    if not isinstance(config, dict):
        raise ValueError(f"설정 파일이 비어있거나 올바른 YAML이 아닙니다: {config_path}")

    if "sample_rate" not in config:
        raise ValueError(f"설정 파일에 'sample_rate'가 없습니다: {config_path}")

    sample_rate = config["sample_rate"]
    if not isinstance(sample_rate, (int, float)) or sample_rate <= 0:
        raise ValueError(f"sample_rate는 양수여야 합니다 (현재: {sample_rate})")
    time_axis = config.get("time_axis", {})

    # ULog 파싱
    ulog = ULog(ulg_path)
    utc_offset_us = get_utc_offset(ulog)

    # 공통 타임그리드 생성
    target_ts_us = build_target_timestamps(ulog, sample_rate)
    if len(target_ts_us) == 0:
        raise ValueError(f"ULG 파일의 유효 시간이 0초입니다: {ulg_path}")

    timestamps_ms = [
        us_to_epoch_ms(int(t), utc_offset_us) for t in target_ts_us
    ]

    # 밀리초 반올림으로 인한 중복 타임스탬프 제거 (단조증가 보장)
    corrections = 0
    for i in range(1, len(timestamps_ms)):
        if timestamps_ms[i] <= timestamps_ms[i - 1]:
            timestamps_ms[i] = timestamps_ms[i - 1] + 1
            corrections += 1

    if corrections > 0:
        print(f"[경고] {corrections}개 타임스탬프 단조증가 보정 (sample_rate가 높으면 정상)")

    n_samples = len(timestamps_ms)
    start_time = timestamps_ms[0]
    end_time = timestamps_ms[-1]
    duration = (end_time - start_time) / 1000.0

    if "tracks" not in config or not isinstance(config["tracks"], list):
        raise ValueError(f"설정 파일에 'tracks' 배열이 없습니다: {config_path}")

    # 트랙/채널 구성
    tracks = []
    channels = {}
    channel_meta = {}
    skipped = []

    for track_cfg in config["tracks"]:
        track_channel_ids = []

        for ch_cfg in track_cfg.get("channels", []):
            topic_name = ch_cfg["topic"]
            field_name = ch_cfg["field"]
            multi_id = int(ch_cfg.get("multi_id", 0))
            channel_id = f"{topic_name}__{field_name}".replace("[", "_").replace("]", "")
            if multi_id > 0:
                channel_id = f"{topic_name}_{multi_id}__{field_name}".replace("[", "_").replace("]", "")

            # ULog에서 토픽 데이터 조회
            topic_data = find_topic_data(ulog, topic_name, multi_id)
            if topic_data is None:
                skipped.append(f"{topic_name}.{field_name} (토픽 없음)")
                continue

            if field_name not in topic_data.data:
                skipped.append(f"{topic_name}.{field_name} (필드 없음)")
                continue

            # 리샘플링 (scale 적용: 예 — GPS degE7 → deg)
            src_ts = topic_data.data["timestamp"].astype(np.float64)
            raw_values = topic_data.data[field_name]
            if raw_values.ndim > 1:
                skipped.append(f"{topic_name}.{field_name} (다차원 배열 — 인덱스 지정 필요, 예: {field_name}[0])")
                continue
            src_values = raw_values.astype(np.float64)
            scale = float(ch_cfg.get("scale", 1.0))

            # 데이터 공백 감지 (경고만, 채널은 계속 처리)
            if len(src_ts) > 1:
                diffs = np.diff(src_ts)
                median_interval = np.median(diffs)
                if median_interval > 0:
                    large_gaps = np.where(diffs > median_interval * 10)[0]
                    if len(large_gaps) > 0:
                        max_gap = float(np.max(diffs[large_gaps])) / 1e6
                        print(f"[경고] {topic_name}.{field_name}: 데이터 공백 {len(large_gaps)}개 (최대 {max_gap:.1f}초) — 보간값 주의")

            resampled = resample_to_grid(src_ts, src_values, target_ts_us.astype(np.float64), scale)

            channels[channel_id] = resampled
            channel_meta[channel_id] = {
                "name": ch_cfg.get("name", field_name),
                "unit": ch_cfg.get("unit", ""),
                "color": ch_cfg.get("color", "#888888"),
                "chartType": track_cfg.get("chart_type", "line"),
            }
            track_channel_ids.append(channel_id)

        if track_channel_ids:
            tracks.append({
                "id": track_cfg["id"],
                "name": track_cfg["name"],
                "chartType": track_cfg.get("chart_type", "line"),
                "channels": track_channel_ids,
            })

    if skipped:
        print(f"[경고] 건너뛴 채널 ({len(skipped)}개):")
        for s in skipped:
            print(f"  - {s}")

    # dm_schema JSON 구성
    result = {
        "schemaVersion": "1.0",
        "meta": {
            "startTime": start_time,
            "endTime": end_time,
            "duration": round(duration, 1),
            "nSamples": n_samples,
            "sampleRate": sample_rate,
            "timeAxis": {
                "origin": time_axis.get("origin", "absolute"),
                "format": time_axis.get("format", "HH:mm:ss"),
                "timezone": time_axis.get("timezone", "UTC"),
            },
        },
        "timestamps": timestamps_ms,
        "tracks": tracks,
        "channels": channels,
        "channelMeta": channel_meta,
    }

    # 저장
    output = Path(output_path).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)

    print(f"변환 완료: {output_path}")
    print(f"  시간: {duration:.1f}초, 샘플: {n_samples}, 트랙: {len(tracks)}, 채널: {sum(len(t['channels']) for t in tracks)}")


def main():
    parser = argparse.ArgumentParser(description="ULG → dm_schema JSON 변환")
    parser.add_argument("--input", "-i", help="입력 ULG 파일 경로")
    parser.add_argument("--input-dir", help="입력 ULG 디렉토리 (일괄 변환)")
    parser.add_argument("--config", "-c", help="트랙 설정 YAML 파일")
    parser.add_argument("--output", "-o", help="출력 JSON 파일 경로")
    parser.add_argument("--output-dir", help="출력 디렉토리 (일괄 변환)")
    parser.add_argument("--list-topics", action="store_true", help="ULG 파일의 토픽 목록만 출력")
    args = parser.parse_args()

    if args.list_topics:
        if not args.input:
            parser.error("--list-topics 에는 --input 이 필요합니다")
        list_topics(args.input)
        return

    if not args.config:
        parser.error("--config 가 필요합니다")

    if args.input_dir:
        # 일괄 변환
        input_dir = Path(args.input_dir)
        output_dir = Path(args.output_dir or "./output")
        ulg_files = sorted(input_dir.glob("*.ulg"))
        if not ulg_files:
            print(f"'{input_dir}'에 ULG 파일이 없습니다.")
            return
        print(f"{len(ulg_files)}개 파일 변환 시작...")
        for ulg_file in ulg_files:
            out_file = output_dir / f"{ulg_file.stem}.json"
            try:
                convert(str(ulg_file), args.config, str(out_file))
            except Exception as e:
                print(f"[오류] {ulg_file.name}: {e}")
    elif args.input:
        output = args.output or str(Path(args.input).with_suffix(".json"))
        convert(args.input, args.config, output)
    else:
        parser.error("--input 또는 --input-dir 이 필요합니다")


if __name__ == "__main__":
    main()
