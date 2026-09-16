#!/usr/bin/env bash
# Copy root-owned public assets into a built site, including the legacy icon URL.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_OUTPUT="${1:?Usage: bash scripts/copy-shared-assets.sh <site-output>}"

[ -f "$SITE_OUTPUT/blog/index.html" ] || {
  echo "먼저 <site-output>/blog/에 블로그를 빌드하세요." >&2
  exit 1
}

mkdir -p "$SITE_OUTPUT/assets"
cp -a "$REPO_ROOT/assets/." "$SITE_OUTPUT/assets/"
cp "$REPO_ROOT/favicon.svg" "$SITE_OUTPUT/favicon.svg"
# Preserve /blog/favicon.svg without maintaining a second source file.
cp "$REPO_ROOT/favicon.svg" "$SITE_OUTPUT/blog/favicon.svg"
