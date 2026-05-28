#!/usr/bin/env bash
# Build a Synapse App as an OCI image with the manifest baked into the
# `io.synapse.app.manifest` label, then push :SEMVER + :latest to the
# Datamaker registry. Run from inside the app source dir.
#
# Usage:
#   bash publish.sh <slug> <semver>
#
# Env overrides:
#   REGISTRY  default registry.local.datamaker.io
#   NS        default synapse_apps
#   CONTEXT   default .  (Docker build context)

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <slug> <semver>" >&2
  exit 2
fi

SLUG=$1
VERSION=$2
REGISTRY=${REGISTRY:-registry.local.datamaker.io}
NS=${NS:-synapse_apps}
CONTEXT=${CONTEXT:-.}

if [[ ! -f "${CONTEXT}/synapse-app.yaml" ]]; then
  echo "${CONTEXT}/synapse-app.yaml not found" >&2
  exit 2
fi

REF="${REGISTRY}/${NS}/${SLUG}"
LABEL=$(base64 -w0 "${CONTEXT}/synapse-app.yaml")

docker build \
  --label "io.synapse.app.manifest=${LABEL}" \
  -t "${REF}:${VERSION}" \
  -t "${REF}:latest" \
  "${CONTEXT}"

docker push "${REF}:${VERSION}"
docker push "${REF}:latest"

echo "published ${REF}:{${VERSION},latest}"
