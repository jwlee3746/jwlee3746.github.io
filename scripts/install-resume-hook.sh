#!/usr/bin/env bash
# 클론 또는 worktree 생성 후 한 번 실행한다.
set -euo pipefail
cd "$(dirname "$0")/.."
HOOK="$(git rev-parse --git-path hooks/pre-commit)"
mkdir -p "$(dirname "$HOOK")"
cat > "$HOOK" <<'HOOK_BODY'
#!/usr/bin/env bash
set -euo pipefail
exec bash "$(git rev-parse --show-toplevel)/scripts/resume-pre-commit.sh"
HOOK_BODY
chmod +x "$HOOK"
echo "설치 완료: $HOOK"
echo "이력서 데이터·템플릿 변경 시 HTML과 PDF를 함께 생성합니다."
