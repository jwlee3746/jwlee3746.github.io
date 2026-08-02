#!/usr/bin/env bash
# resume/index.html을 고치고 PDF를 안 맞추는 실수를 막는 pre-commit 훅을 설치한다.
# 훅은 .git/ 안에 있어 레포로 공유되지 않으므로, 클론한 뒤 한 번 실행해 둔다.
#   bash resume/install-hook.sh
set -euo pipefail

cd "$(dirname "$0")/.."
HOOK=".git/hooks/pre-commit"

cat > "$HOOK" <<'HOOK_BODY'
#!/usr/bin/env bash
# resume/index.html이 스테이징되면 PDF를 다시 뽑아 함께 커밋한다.
set -euo pipefail

git diff --cached --name-only | grep -qx 'resume/index.html' || exit 0

echo "resume/index.html이 변경되어 PDF를 다시 생성합니다..."
if ! bash resume/build-pdf.sh; then
  echo "PDF 생성에 실패해 커밋을 중단합니다." >&2
  exit 1
fi
git add resume/jaewon-lee-resume.pdf
HOOK_BODY

chmod +x "$HOOK"
echo "설치 완료: $HOOK"
echo "이제 resume/index.html을 커밋하면 PDF가 자동으로 재생성되어 함께 올라갑니다."
