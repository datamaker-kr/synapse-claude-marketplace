# Smart Tool Configuration

Smart tools provide AI-assisted annotation capabilities in Synapse.

## Configuration Fields

```yaml
# Smart tool settings
annotation_category: object_detection
annotation_type: bbox
smart_tool: automatic
```

## Annotation Categories

| Category | Description |
|----------|-------------|
| `object_detection` | Detect and locate objects |
| `segmentation` | Pixel-level classification |
| `classification` | Image/object classification |
| `text` | Text annotation and OCR |
| `keypoint` | Body/object keypoint detection |

## Annotation Types

| Type | Description |
|------|-------------|
| `bbox` | Bounding boxes |
| `polygon` | Polygon shapes |
| `point` | Single points |
| `line` | Line segments |
| `mask` | Bitmap masks |
| `label` | Classification labels |

## Smart Tool Types

| Type | Description |
|------|-------------|
| `automatic` | Fully automated annotation |
| `interactive` | User-guided annotation |
| `semi_automatic` | Suggests, user confirms |

## Complete Example

```yaml
name: "SAM Segmentation"
code: sam-segment
version: 1.0.0
category: smart_tool

annotation_category: segmentation
annotation_type: polygon
smart_tool: interactive

data_type: image
tasks:
  - image.segmentation

actions:
  segment:
    entrypoint: plugin.segment:SegmentAction
    method: task
    description: "Interactive segmentation with SAM"
```
