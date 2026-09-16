#!/usr/bin/env bash
# 기존 명령을 유지하는 진입점. 데이터 → HTML → PDF 생성은 TypeScript가 담당한다.
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/build-resume-pdf.ts "$@"
