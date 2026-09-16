#!/usr/bin/env bash
# 생성 결과에 스테이징하지 않은 원본이 섞이지 않도록 확인한 뒤 PDF를 함께 갱신한다.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
INPUTS='^(data/(site/resume\.json|profile/resume\.json|portfolio/(resume\.json|experience\.json|education\.json|projects/.*\.json))|theme/resume/.*|pages/(resume|shared)/.*|public/favicon\.svg|scripts/(build-resume-(html|pdf)\.ts|build-resume-pdf\.sh|resume/.*)|jaewon-lee-resume\.pdf|package(-lock)?\.json|tsconfig\.json|\.nvmrc)$'
if ! git diff --cached --name-only | grep -E "$INPUTS" > /dev/null; then
  exit 0
fi
if { git diff --name-only; git ls-files --others --exclude-standard; } | grep -E "$INPUTS" > /dev/null; then
  echo "이력서 원본 또는 산출물에 스테이징하지 않은 변경이 있습니다. 관련 파일을 모두 스테이징한 뒤 다시 커밋하세요." >&2
  exit 1
fi
node scripts/build-resume-pdf.ts
git add jaewon-lee-resume.pdf
