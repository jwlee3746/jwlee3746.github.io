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

docker run --rm -v "$PWD":/w -w /w ruby:3.1-slim bash -c '
set -e
apt-get update -qq >/dev/null 2>&1
apt-get install -y -qq build-essential git >/dev/null 2>&1
gem install jekyll -v 3.9.3 --no-document -q >/dev/null 2>&1
gem install kramdown-parser-gfm jekyll-paginate jekyll-sitemap jekyll-gist \
            jekyll-feed jekyll-include-cache --no-document -q >/dev/null 2>&1

# Gemfile 은 이 레포를 테마 gem 으로 선언하고 jekyll-admin 을 요구한다.
# Pages 는 그 Gemfile 을 쓰지 않으므로 사본에서 치우고 빌드한다.
cp -r /w /build && cd /build
# linked worktree의 .git 파일은 컨테이너 밖 경로를 가리키므로 빌드 사본에서 제거한다.
rm -rf .git
rm -f Gemfile Gemfile.lock

JEKYLL_ENV=production jekyll build --destination /tmp/site 2>&1 \
  | grep -vE "^\s+from |Faraday" | head -20

echo "--- 산출물 ---"
if [ -f /tmp/site/assets/css/main.css ]; then
  echo "main.css $(wc -c < /tmp/site/assets/css/main.css) bytes"
  grep -q "mm-bg" /tmp/site/assets/css/main.css && echo "  토큰 포함 OK" || { echo "  토큰 없음"; exit 1; }
else
  echo "main.css 가 생성되지 않았습니다 — SCSS 컴파일 실패"; exit 1
fi
[ -f /tmp/site/Paper/Attention1/index.html ] || { echo "글이 생성되지 않았습니다"; exit 1; }
[ -f /tmp/site/posts/index.html ] || { echo "Posts 목록이 생성되지 않았습니다"; exit 1; }
[ -f /tmp/site/categories/evaluation/index.html ] || { echo "Evaluation 카테고리가 생성되지 않았습니다"; exit 1; }
grep -q "재현 가능한 LLM 에이전트 평가" /tmp/site/categories/evaluation/index.html || { echo "평가 글이 Evaluation 카테고리에 없습니다"; exit 1; }
grep -q "LangChain deepagents SDK" /tmp/site/categories/Agent/index.html || { echo "일반 에이전트 글이 Agent 카테고리에 없습니다"; exit 1; }
if grep -q "재현 가능한 LLM 에이전트 평가" /tmp/site/categories/Agent/index.html; then
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
  [ -f "/tmp/site/$page/index.html" ] || { echo "$page 글이 생성되지 않았습니다"; exit 1; }
done

for diagram in \
  series-overview-v2.svg \
  trace-data-flywheel.svg \
  tc-vs-simulator.svg \
  harness-common-model.svg \
  hybrid-evaluation-loop.svg; do
  [ -f "/tmp/site/assets/images/posts_img/agent-evaluation-series/$diagram" ] || { echo "$diagram 다이어그램이 누락됐습니다"; exit 1; }
done

for diagram in \
  device-assistant-evaluation-episode.svg \
  device-assistant-evaluation-layers.svg; do
  [ -f "/tmp/site/assets/images/posts_img/device-assistant-evaluation/$diagram" ] || { echo "$diagram 다이어그램이 누락됐습니다"; exit 1; }
done
[ -f /tmp/site/assets/images/posts_img/openclaw-runtime-map.svg ] || { echo "OpenClaw 다이어그램이 누락됐습니다"; exit 1; }
echo "빌드 검증 통과"
'
