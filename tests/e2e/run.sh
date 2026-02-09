#!/usr/bin/env bash
# Build and run the Rho E2E test in a container.
# Supports both Docker and Podman (auto-detects).
# Usage: ./tests/e2e/run.sh [--no-cache]
set -e

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
IMAGE="rho-e2e"

# Auto-detect container runtime
if command -v docker &>/dev/null; then
  RUNTIME="docker"
elif command -v podman &>/dev/null; then
  RUNTIME="podman"
else
  echo "Error: neither docker nor podman found on PATH"
  exit 1
fi

build_args=""
if [[ "$1" == "--no-cache" ]]; then
  build_args="--no-cache"
fi

echo "Using $RUNTIME"
echo "Building $IMAGE..."
$RUNTIME build $build_args -t "$IMAGE" -f "$REPO_DIR/tests/e2e/Dockerfile" "$REPO_DIR"

echo ""
echo "Running E2E tests..."
$RUNTIME run --rm "$IMAGE"
