# 시냅스 핵심 데이터 모델

## 엔티티 관계

### Workspace → Project

```
Workspace (1) ──── (N) Project
  - Project.title (NOT name)
  - 카드형 목록으로 표시
```

### Project → Data Collection

```
Project (1) ──── (N) DataCollection
  DataCollection (1) ──── (N) FileSpecification
    - name: 스펙 식별자 (e.g., "image_1")
    - file_type: 파일 유형
    - extensions: 허용 확장자 목록
    - is_required: 필수 여부
  DataCollection (1) ──── (N) DataUnit
    - meta: JSONField (유닛별 메타데이터)
  DataCollection.data_unit_meta_schema: JSON Schema (유효성 검증)
```

### Project → Workshop → Task → Assignment

```
Project (1) ──── (N) Workshop (hitl_workshop 테이블)
  Workshop (1) ──── (N) Task
    - Task는 직접 project_id FK 보유 (workshop 통한 join 불필요)
    Task (1) ──── (N) Assignment (hitl_assignment 테이블)
      - data: JSONField ← 어노테이션 데이터 (DM Schema v1)
      - AssignmentData (hitl_assignmentdata): 파일 참조 저장, NOT 어노테이션 JSON
```

### Ground Truth

```
Project (1) ──── (N) GroundTruthDataset
  GroundTruthDataset (1) ──── (N) GroundTruthVersion
    GroundTruthVersion (1) ──── (N) GroundTruthEvent
```

### Storage

```
Workspace (1) ──── (N) Storage
  - 지원: S3, GCS, SFTP, Local
  - default_storage 존재
```

## DM Schema v1 (어노테이션 데이터 형식)

```json
{
  "assignmentId": "job-123",
  "annotations": {
    "<file_spec_name>": [
      {
        "id": "unique-annotation-id",
        "type": "bbox | polygon | polyline | keypoint | classification",
        "data": "<type-specific-data>",
        "classification": "class-label",
        "attributes": {}
      }
    ]
  }
}
```

### 어노테이션 타입별 data 형식

| 타입 | data 형식 | 설명 |
|------|----------|------|
| `bbox` | `[x, y, w, h]` | 바운딩 박스 좌표 |
| `polygon` | `[[x1,y1], [x2,y2], ...]` | 다각형 꼭짓점 좌표 |
| `polyline` | `[[x1,y1], [x2,y2], ...]` | 선분 꼭짓점 좌표 |
| `keypoint` | `[x, y]` 또는 keypoint 구조 | 키포인트 좌표 |
| `classification` | `null` 또는 없음 | 이미지 수준 분류 |

## 주요 API 엔드포인트 패턴

```python
# 프로젝트
client.get_project(id)           # 단일 프로젝트 조회
# Project.title (NOT name)

# 데이터 컬렉션
client.get_data_collection(id)   # 단일 컬렉션 조회

# 어사인먼트
client.list_assignments(params, list_all=True)  # 어노테이션 목록 조회

# 태스크
client.list_tasks(params, list_all=True)        # 태스크 목록 조회

# Ground Truth
client.list_ground_truth_events(params, list_all=True)

# 스토리지
client.get_storage(id)
client.get_default_storage()

# 업로드
client.upload_files_bulk(paths, max_workers=32)
client.create_data_units(data)
```

## 주요 데이터 제약사항

| 항목 | 제약 |
|------|------|
| API 페이지 사이즈 | 최대 100건 |
| 대량 데이터 (10K+) | Export 플러그인 시스템 사용 권장 |
| API 페이지네이션 | 134K건 기준 30-90분 소요 → `BaseExporter` + 스크립트 제출 권장 |
| `list_all=True` | 자동 페이지네이션 처리 |
