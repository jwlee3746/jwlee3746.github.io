#!/usr/bin/env bash
# resume/index.html -> resume/jaewon-lee-resume.pdf (A4 다중 페이지)
# index.html을 고친 뒤에는 반드시 이 스크립트를 다시 돌려 PDF를 맞춰둔다.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT="resume/jaewon-lee-resume.pdf"
TMP="$(mktemp -t resume-XXXXXX.pdf)"
LOG_DIR="$(mktemp -d -t resume-build-XXXXXX)"
PORT="${PORT:-8901}"

cleanup() {
  [ -n "${SERVER:-}" ] && kill "$SERVER" 2>/dev/null || true
  rm -f "$TMP"
  rm -rf "$LOG_DIR"
}
trap cleanup EXIT

CHROME=""
for c in google-chrome google-chrome-stable chromium chromium-browser; do
  command -v "$c" >/dev/null 2>&1 && { CHROME="$c"; break; }
done
[ -n "$CHROME" ] || { echo "Chrome/Chromium을 찾을 수 없습니다." >&2; exit 1; }

# 폰트·절대경로를 그대로 살리기 위해 로컬 서버로 렌더링한다.
# 포트가 이미 쓰이고 있으면 여기서 멈춘다 — 예전에는 남의 서버가 응답한
# 엉뚱한 페이지가 그대로 PDF로 저장되고도 "성공"으로 끝났다.
if curl -sf -o /dev/null "http://localhost:$PORT/" 2>/dev/null; then
  echo "포트 $PORT를 이미 다른 프로세스가 쓰고 있습니다. PORT=<다른포트> 로 다시 실행하세요." >&2
  exit 1
fi

python3 -m http.server "$PORT" > "$LOG_DIR/server.log" 2>&1 &
SERVER=$!

# 서버가 실제로 응답할 때까지 기다린다
for i in $(seq 1 40); do
  curl -sf -o /dev/null "http://localhost:$PORT/resume/" && break
  if [ "$i" = 40 ]; then
    echo "로컬 서버 기동 실패:" >&2
    cat "$LOG_DIR/server.log" >&2
    exit 1
  fi
  sleep 0.25
done

"$CHROME" --headless --disable-gpu --no-sandbox \
  --virtual-time-budget=10000 --no-pdf-header-footer \
  --print-to-pdf="$TMP" "http://localhost:$PORT/resume/" 2> "$LOG_DIR/chrome.log" \
  || { echo "Chrome 렌더링 실패:" >&2; cat "$LOG_DIR/chrome.log" >&2; exit 1; }

# 페이지 수와 내용을 함께 검증한다. 통과한 것만 실제 산출물 자리에 옮긴다.
# 본문 텍스트는 서브셋 폰트로 인코딩돼 평문으로 남지 않으므로, 대신 이력서 서식이
# 실제로 적용됐다는 증거(IBM Plex 임베딩)와 분량을 본다. 브라우저 오류 페이지는
# 시스템 폰트만 쓰므로 여기서 걸린다.
python3 - "$TMP" <<'PY'
import re, sys, os

path = sys.argv[1]
data = open(path, 'rb').read()

pages = len(re.findall(rb'/Type\s*/Page[^s]', data))
fonts = {f.decode() for f in re.findall(rb'/BaseFont\s*/[A-Z]{6}\+([A-Za-z0-9\-]+)', data)}
size = os.path.getsize(path)

def die(msg):
    print(f"검증 실패: {msg}", file=sys.stderr)
    sys.exit(1)

if not any(f.startswith('IBMPlex') for f in fonts):
    die(f"이력서 서식이 적용되지 않았습니다 — 오류 페이지가 저장됐을 수 있습니다 "
        f"(임베드 폰트: {sorted(fonts) or '없음'})")
if size < 50_000:
    die(f"PDF가 비정상적으로 작습니다 ({size:,}B)")
if pages < 1 or pages > 3:
    die(f"페이지 수가 예상 범위(1~3페이지)를 벗어났습니다 ({pages}페이지)")

print(f"검증 통과: {pages}페이지, {size:,}B")
PY

mv "$TMP" "$OUT"
echo "생성 완료: $OUT"
