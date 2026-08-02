#!/usr/bin/env bash
# resume/index.html -> resume/jaewon-lee-resume.pdf (A4 1장)
# index.html을 고친 뒤에는 반드시 이 스크립트를 다시 돌려 PDF를 맞춰둔다.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="resume/jaewon-lee-resume.pdf"
PORT=8901

CHROME=""
for c in google-chrome google-chrome-stable chromium chromium-browser; do
  command -v "$c" >/dev/null 2>&1 && { CHROME="$c"; break; }
done
[ -n "$CHROME" ] || { echo "Chrome/Chromium을 찾을 수 없습니다." >&2; exit 1; }

# 폰트·절대경로를 그대로 살리기 위해 로컬 서버로 렌더링한다
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1

"$CHROME" --headless --disable-gpu --no-sandbox \
  --virtual-time-budget=10000 --no-pdf-header-footer \
  --print-to-pdf="$OUT" "http://localhost:$PORT/resume/" 2>/dev/null

PAGES=$(python3 -c "
import re,sys
d=open('$OUT','rb').read()
print(len(re.findall(rb'/Type\s*/Page[^s]', d)))
")
echo "생성 완료: $OUT (${PAGES}페이지)"
[ "$PAGES" = "1" ] || { echo "경고: 1장을 넘었습니다. 내용을 줄이세요." >&2; exit 1; }
