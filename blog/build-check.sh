#!/usr/bin/env bash
# GitHub Pages 와 같은 조건으로 빌드를 재현해 본다.
#
# 왜 필요한가: Pages 의 legacy 빌드는 jekyll-sass-converter 1.5.2 를 쓰고,
# 그 안은 dart-sass 도 libsass 도 아닌 **Ruby Sass 3.x** 다. 로컬 dart-sass 로
# 통과한 SCSS 가 배포에서 죽는 일이 실제로 두 번 있었다.
#
#   1. hsl(188deg 52% 18%)  — 공백 구분 표기를 SassScript 자리에서 못 읽는다
#   2. --wave: url("data:image/svg+xml,...")  — 커스텀 프로퍼티 값의 url() 을 못 읽는다
#
# 그래서 CSS 만 검사하지 않고 사이트 전체를 빌드한다. 로컬에 ruby 가 없어도
# 도커만 있으면 돌아간다.
set -euo pipefail
cd "$(dirname "$0")"

command -v docker >/dev/null || { echo "docker 가 필요합니다." >&2; exit 1; }

docker run --rm -v "$(dirname "$PWD")":/repo:ro -w /repo/blog \
  ruby:3.1-slim@sha256:2704d8eede6d399b07e5475cae41f7e7077edd9e970753f543ddb445f7f0424f bash -c '
set -euo pipefail
apt-get update -qq >/dev/null 2>&1
apt-get install -y -qq build-essential git >/dev/null 2>&1
gem install bundler -v 2.5.23 --no-document

# 소스는 읽기 전용으로 마운트하고 컨테이너 안의 사본에서 의존성을 설치한다.
cp -r /repo/blog /build && cd /build
# linked worktree의 .git 파일은 컨테이너 밖 경로를 가리키므로 빌드 사본에서 제거한다.
rm -rf .git
bundle _2.5.23_ config set --local frozen true
bundle _2.5.23_ install

# 빌드 실패를 파이프로 숨기지 않고 즉시 검사 실패로 전달한다.
JEKYLL_ENV=production bundle _2.5.23_ exec jekyll build --safe --destination /tmp/site/blog
bash /repo/scripts/copy-shared-assets.sh /tmp/site

# 공용 경로가 블로그 baseurl과 중복되지 않고, 호환 아이콘도 같은 원본인지 확인한다.
grep -q "src=\"/assets/avatar.jpg\"" /tmp/site/blog/index.html
grep -q "href=\"/favicon.svg\"" /tmp/site/blog/index.html
cmp /repo/assets/avatar.jpg /tmp/site/assets/avatar.jpg
cmp /repo/favicon.svg /tmp/site/favicon.svg
cmp /repo/favicon.svg /tmp/site/blog/favicon.svg

echo "--- 산출물 ---"
if [ -f /tmp/site/blog/assets/css/main.css ]; then
  echo "main.css $(wc -c < /tmp/site/blog/assets/css/main.css) bytes"
  grep -q "mm-bg" /tmp/site/blog/assets/css/main.css && echo "  토큰 포함 OK" || { echo "  토큰 없음"; exit 1; }
else
  echo "main.css 가 생성되지 않았습니다 — SCSS 컴파일 실패"; exit 1
fi
[ -f /tmp/site/blog/Paper/Attention1/index.html ] || { echo "글이 생성되지 않았습니다"; exit 1; }
[ -f /tmp/site/blog/posts/index.html ] || { echo "Posts 목록이 생성되지 않았습니다"; exit 1; }
[ -f /tmp/site/blog/search/index.html ] || { echo "검색 페이지가 생성되지 않았습니다"; exit 1; }
[ -f /tmp/site/blog/assets/js/lunr/lunr-store.js ] || { echo "검색 인덱스가 생성되지 않았습니다"; exit 1; }
[ -f /tmp/site/blog/categories/evaluation/index.html ] || { echo "Evaluation 카테고리가 생성되지 않았습니다"; exit 1; }
grep -q "재현 가능한 LLM 에이전트 평가" /tmp/site/blog/categories/evaluation/index.html || { echo "평가 글이 Evaluation 카테고리에 없습니다"; exit 1; }
grep -q "LangChain deepagents SDK" /tmp/site/blog/categories/Agent/index.html || { echo "일반 에이전트 글이 Agent 카테고리에 없습니다"; exit 1; }
if grep -q "재현 가능한 LLM 에이전트 평가" /tmp/site/blog/categories/Agent/index.html; then
  echo "평가 글이 Agent 카테고리에 남아 있습니다"; exit 1
fi

for page in \
  Agent/reproducible-agent-evaluation \
  Agent/evaluation-contract-validation \
  Agent/multi-step-agent-evaluation \
  Agent/agent-path-scoring \
  Agent/evaluation-checkpoint-provenance \
  Agent/trace-to-eval-data-flywheel \
  Agent/test-case-vs-simulator-evaluation \
  Agent/agent-evaluation-harness-landscape \
  Agent/hybrid-agent-evaluation-strategy \
  Agent/demystifying-agent-evals-korean \
  Agent/device-assistant-evaluation \
  Agent/openclaw-architecture-research \
  Agent/openclaw-component-application; do
  [ -f "/tmp/site/blog/$page/index.html" ] || { echo "$page 글이 생성되지 않았습니다"; exit 1; }
done

for diagram in \
  series-overview-v2.svg \
  trace-data-flywheel.svg \
  tc-vs-simulator.svg \
  harness-common-model.svg \
  hybrid-evaluation-loop.svg; do
  [ -f "/tmp/site/blog/assets/images/posts_img/agent-evaluation-series/$diagram" ] || { echo "$diagram 다이어그램이 누락됐습니다"; exit 1; }
done

for diagram in \
  device-assistant-evaluation-episode.svg \
  device-assistant-evaluation-layers.svg; do
  [ -f "/tmp/site/blog/assets/images/posts_img/device-assistant-evaluation/$diagram" ] || { echo "$diagram 다이어그램이 누락됐습니다"; exit 1; }
done
[ -f /tmp/site/blog/assets/images/posts_img/openclaw-runtime-map.svg ] || { echo "OpenClaw 다이어그램이 누락됐습니다"; exit 1; }
echo "빌드 검증 통과"
'
