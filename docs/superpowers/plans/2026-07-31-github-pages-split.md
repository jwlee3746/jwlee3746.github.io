# GitHub Pages 2개 레포 분리 실행 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 포트폴리오를 `https://jwlee3746.github.io/` 루트로, 기술 블로그를 `https://jwlee3746.github.io/blog/` 하위로 분리하고 두 사이트를 상호 연결한다.

**Architecture:** 두 GitHub 레포를 rename해 URL 소유권을 교환한다. 포트폴리오 레포에서 Jekyll 글의 HTML 복제본을 제거해 글 관리를 Jekyll 한 곳으로 단일화하고, Jekyll에는 `baseurl: /blog`를 적용한다. 각 사이트 네비게이션에 상대편으로 나가는 링크를 둔다.

**Tech Stack:** GitHub Pages (legacy build), Jekyll 4 + minimal-mistakes, 순수 HTML/CSS/JS, `gh` CLI

**Spec:** `docs/superpowers/specs/2026-07-31-github-pages-split-design.md`

## Global Constraints

- 로컬 작업 경로: 포트폴리오 `/home/ubuntu/temp/portfolio`, 블로그 `/home/ubuntu/temp/blog`
- 두 레포 모두 작업 브랜치 `site-restructure`에서 작업하고, Task 6에서 한꺼번에 `main`으로 머지한다. GitHub Pages는 `main` 브랜치에서 빌드하므로 머지 전까지 라이브 사이트는 변하지 않는다.
- Ruby / Bundler / Jekyll이 로컬에 설치되어 있지 않다. Jekyll 빌드 검증은 배포 후 `curl`로 수행한다.
- 커밋 메시지 본문에는 재현 명령어를 포함한다 (특히 `mkdir`, 파일 복사, `gh repo rename` 등 코드 변경만으로 재현되지 않는 작업).
- 레포 rename(Task 6)은 되돌릴 수 있지만 외부에 노출된 URL을 바꾸는 작업이다. Task 1~5를 모두 마치고 검토한 뒤 수행한다.
- 최종 URL 형태: 포트폴리오 `https://jwlee3746.github.io/`, 블로그 `https://jwlee3746.github.io/blog/`, 글 `https://jwlee3746.github.io/blog/Paper/Attention1/`

---

### Task 1: 블로그 — baseurl 적용과 이미지 경로 수정

`baseurl: /blog`를 넣으면 minimal-mistakes의 테마 링크는 `relative_url` 필터 덕에 자동 대응하지만, 본문에 하드코딩된 `{{site.url}}/assets/...`는 대응하지 못한다. `site.url`은 `https://jwlee3746.github.io`이고 `baseurl`이 붙지 않으므로 **13개 파일의 이미지가 전부 깨진다.** 두 변경은 반드시 같은 커밋에 들어가야 한다.

**Files:**
- Modify: `blog/_config.yml:25`
- Modify: `blog/_posts/2024-05-08-1.md`
- Modify: `blog/_posts/논문리뷰/2024-05-19-1.md`, `2024-05-20-1.md`, `2024-05-21-1.md`
- Modify: `blog/_posts/머신러닝/2024-05-30-1.md`
- Modify: `blog/_posts/문제풀이/2024-05-22-1.md`, `2024-05-23-1.md`, `2024-05-24-1.md`, `2024-05-26-1.md`, `2024-05-27-1.md`, `2024-05-28-1.md`, `2024-05-31-1.md`
- Modify: `blog/_pages/about.md`

**Interfaces:**
- Produces: 블로그 사이트의 모든 경로에 `/blog` 접두사가 붙는다. Task 2와 Task 4의 링크는 이 접두사를 전제로 한다.

- [ ] **Step 1: 작업 브랜치 생성**

```bash
cd /home/ubuntu/temp/blog
git checkout -b site-restructure
```

- [ ] **Step 2: 수정 대상 확인 (변경 전 기준선)**

```bash
grep -rn '{{site\.url}}/assets/' _posts _pages | wc -l
```

Expected: `20` (13개 파일에 걸친 20개 참조)

- [ ] **Step 3: baseurl 설정**

`_config.yml` 25번째 줄을 다음과 같이 바꾼다.

변경 전:
```yaml
baseurl                  : # the subpath of your site, e.g. "/blog"
```

변경 후:
```yaml
baseurl                  : "/blog" # the subpath of your site, e.g. "/blog"
```

24번째 줄 `url: "https://jwlee3746.github.io"`는 변경하지 않는다.

- [ ] **Step 4: 본문 이미지 경로 일괄 수정**

```bash
cd /home/ubuntu/temp/blog
grep -rl '{{site\.url}}/assets/' _posts _pages \
  | xargs sed -i 's|{{site\.url}}/assets/|{{site.url}}{{site.baseurl}}/assets/|g'
```

- [ ] **Step 5: 수정 결과 검증**

```bash
cd /home/ubuntu/temp/blog
echo "남은 미수정: $(grep -rn '{{site\.url}}/assets/' _posts _pages | wc -l)"
echo "수정 완료:   $(grep -rn '{{site\.url}}{{site\.baseurl}}/assets/' _posts _pages | wc -l)"
grep -n 'baseurl' _config.yml | head -2
```

Expected: 남은 미수정 `0`, 수정 완료 `20`, `_config.yml`에 `baseurl : "/blog"`

`_includes/seo.html`과 `_includes/breadcrumbs.html`은 이미 `site.baseurl`을 붙여 쓰고 있다. 테마 파일은 건드리지 않는다.

- [ ] **Step 6: 커밋**

```bash
cd /home/ubuntu/temp/blog
git add _config.yml _posts _pages
git commit -F - <<'EOF'
feat: baseurl을 /blog로 설정하고 본문 이미지 경로 대응

블로그를 https://jwlee3746.github.io/blog/ 하위로 이동하기 위한 설정.
site.url에는 baseurl이 붙지 않으므로 본문의 {{site.url}}/assets/ 참조
20개(13개 파일)를 {{site.url}}{{site.baseurl}}/assets/로 일괄 치환했다.

재현 명령어:

  git checkout -b site-restructure
  grep -rl '{{site\.url}}/assets/' _posts _pages \
    | xargs sed -i 's|{{site\.url}}/assets/|{{site.url}}{{site.baseurl}}/assets/|g'

_config.yml 25행 baseurl 값은 수동 편집.
EOF
```

---

### Task 2: 블로그 — 포트폴리오 연결과 공유 favicon

`_pages/about.md`는 KAIST 학력과 Work Experience가 담긴 실제 이력서라 포트폴리오의 `about.html`과 역할이 겹친다. `_pages/project.md`는 "Project 1 / Learn about the purpose and scope of the project." 수준의 미작성 템플릿이다. 두 항목을 nav에서 내리고 포트폴리오 링크로 대체한다. md 파일 자체는 남겨 되돌리기를 쉽게 둔다.

블로그에는 favicon이 없다 (`_includes/head/custom.html`에 안내 주석만 있음). 포트폴리오의 `favicon.svg`를 공유해 두 사이트가 같은 탭 아이콘을 쓰게 한다.

**spec에서 조정된 항목:** spec은 "좌상단 `JW` 로고를 양쪽 헤더에" 두기로 했으나, minimal-mistakes의 헤더 좌상단은 사이트 타이틀(`Jaynote`)이 차지한다. 이를 `JW`로 바꾸면 블로그 자체 정체성이 사라지고 테마 레이아웃 수정이 필요하다. 블로그 쪽 브랜드 연결은 nav 첫 항목 `Portfolio`(루트 링크)와 공유 favicon으로 대신한다. 포트폴리오의 `JW` 로고는 그대로 유지한다.

**Files:**
- Modify: `blog/_data/navigation.yml`
- Create: `blog/favicon.svg` (포트폴리오에서 복사)
- Modify: `blog/_includes/head/custom.html:3`

**Interfaces:**
- Consumes: Task 1의 `baseurl: /blog`
- Produces: 블로그 → 포트폴리오 왕복 링크. Task 4가 반대 방향을 만든다.

- [ ] **Step 1: `_data/navigation.yml`의 `main` 섹션 교체**

변경 전:
```yaml
main:
  - title: "Home"
    url: https://jwlee3746.github.io/ # 블로그 HOME 바로가기

  - title: "About"
    url: /about/ #_pages/about.md 연결

  - title: "Search"
    url: /search/
    
  - title: "Project"
    url: /Project/
```

변경 후:
```yaml
main:
  - title: "Portfolio"
    url: https://jwlee3746.github.io/ # 포트폴리오 홈 (루트)

  - title: "이력서"
    url: https://jwlee3746.github.io/about.html # 포트폴리오의 이력서 페이지

  - title: "Posts"
    url: /categories/ # 카테고리별 글 목록

  - title: "Search"
    url: /search/
```

`categories:` 이하 사이드바 섹션은 변경하지 않는다.

- [ ] **Step 2: 절대 URL 사용 검증**

포트폴리오로 나가는 링크가 상대 경로면 `relative_url` 필터가 `/blog`를 붙여 블로그 안으로 되돌아온다. 반드시 절대 URL이어야 한다.

```bash
cd /home/ubuntu/temp/blog
sed -n '/^main:/,/^categories:/p' _data/navigation.yml
```

Expected: `Portfolio`와 `이력서`의 url이 `https://`로 시작하고, `Posts`/`Search`는 `/`로 시작

- [ ] **Step 3: favicon 복사**

```bash
cp /home/ubuntu/temp/portfolio/favicon.svg /home/ubuntu/temp/blog/favicon.svg
```

- [ ] **Step 4: favicon 링크 삽입**

`_includes/head/custom.html`의 3번째 줄 주석 아래에 링크를 추가한다.

변경 전:
```html
<!-- start custom head snippets -->

<!-- insert favicons. use https://realfavicongenerator.net/ -->

{% if page.use_math %}
```

변경 후:
```html
<!-- start custom head snippets -->

<!-- insert favicons. use https://realfavicongenerator.net/ -->
<link rel="icon" href="{{ '/favicon.svg' | relative_url }}" type="image/svg+xml">

{% if page.use_math %}
```

`relative_url` 필터가 `baseurl`을 붙여 `/blog/favicon.svg`가 된다. 절대 경로로 쓰면 404가 나므로 필터를 반드시 사용한다.

- [ ] **Step 5: 커밋**

```bash
cd /home/ubuntu/temp/blog
git add _data/navigation.yml favicon.svg _includes/head/custom.html
git commit -F - <<'EOF'
feat: nav에 포트폴리오 왕복 링크 추가, 공유 favicon 적용

이력서와 프로젝트 소개는 포트폴리오가 담당하므로 nav에서 내린다.
_pages/about.md와 _pages/project.md 파일은 되돌리기를 위해 남겨둔다.
포트폴리오로 나가는 링크는 relative_url이 baseurl을 붙이지 않도록 절대 URL로 작성했다.
두 사이트가 같은 탭 아이콘을 쓰도록 포트폴리오의 favicon.svg를 복사했다.

재현 명령어:

  cp /home/ubuntu/temp/portfolio/favicon.svg /home/ubuntu/temp/blog/favicon.svg

_includes/head/custom.html의 favicon link 태그는 수동 삽입.
EOF
```

---

### Task 3: 포트폴리오 — 블로그 자산 제거

포트폴리오의 `posts/` 17개는 블로그 `_posts/` 17개의 HTML 복제본이다. `assets/` 24개는 전부 블로그 글 이미지·MathJax·검색 인덱스이며 유지 페이지(`index`/`about`/`project`/`games`/`contact`) 중 어느 것도 참조하지 않는다 (`grep -n 'assets/'` 결과 없음). 이미지 원본은 블로그 레포 `assets/images/posts_img/`에 있다.

**Files:**
- Delete: `portfolio/posts/` (17개), `portfolio/assets/` (24개)
- Delete: `portfolio/blog.html`, `blog-2.html`, `blog-3.html`, `blog-4.html`
- Delete: `portfolio/categories.html`, `category-*.html` (9개)
- Delete: `portfolio/search.html`

**Interfaces:**
- Produces: 유지 페이지 5개(`index.html`, `about.html`, `project.html`, `games.html`, `contact.html`)와 `styles.css`, `script.js`, `favicon.svg`만 남은 상태. Task 4가 이 페이지들의 링크를 고친다.

- [ ] **Step 1: 삭제 전 상태 기록**

```bash
cd /home/ubuntu/temp/portfolio
git ls-files | wc -l
```

Expected: `67` (spec 1개 + plan 1개 포함). 삭제 대상 56개를 제거하면 11개가 남는다.

- [ ] **Step 2: 삭제 실행**

```bash
cd /home/ubuntu/temp/portfolio
git rm -r -q posts assets
git rm -q blog.html blog-2.html blog-3.html blog-4.html
git rm -q categories.html
git rm -q category-algorithm.html category-computer-vision.html category-etc.html \
           category-generative-model.html category-machine-learning.html \
           category-mlops.html category-nlp.html category-paper.html category-project.html
git rm -q search.html
```

- [ ] **Step 3: 남은 파일 확인**

```bash
cd /home/ubuntu/temp/portfolio
git ls-files
```

Expected: 정확히 다음 11개
```
README.md
about.html
contact.html
docs/superpowers/plans/2026-07-31-github-pages-split.md
docs/superpowers/specs/2026-07-31-github-pages-split-design.md
favicon.svg
games.html
index.html
project.html
script.js
styles.css
```

- [ ] **Step 4: 커밋**

```bash
cd /home/ubuntu/temp/portfolio
git commit -F - <<'EOF'
refactor: 블로그 기능 제거, 글 관리를 Jekyll로 단일화

posts/ 17개는 blog 레포 _posts/ 17개의 HTML 복제본이므로 제거한다
(날짜 1:1 대응 확인, 원본 md는 blog 레포에 유지).
assets/ 24개는 전부 블로그 글 이미지·MathJax·검색 인덱스이며
유지 페이지 어디서도 참조하지 않는다 (원본은 blog 레포에 존재).
search.html은 자체 글 검색 전용이라 함께 제거하고 검색은 Jekyll에 맡긴다.

재현 명령어:

  git rm -r posts assets
  git rm blog.html blog-2.html blog-3.html blog-4.html categories.html search.html
  git rm category-algorithm.html category-computer-vision.html category-etc.html \
         category-generative-model.html category-machine-learning.html \
         category-mlops.html category-nlp.html category-paper.html category-project.html
EOF
```

---

### Task 4: 포트폴리오 — 링크 정리와 블로그 연결

Task 3에서 지운 파일을 가리키는 참조가 유지 페이지에 남아 있다. `grep` 조사 결과 네 종류다.

1. 5개 페이지 전부의 `<nav>` — `blog.html`, `search.html` 참조
2. `index.html:22` 히어로 영역 — `blog.html` 참조
3. `project.html:9` 프로젝트 카드 — `posts/2024-06-11-project-redis-1.html`, `category-project.html` 참조
4. `script.js:8-14` — 삭제된 `assets/js/posts-index.js`에 의존하는 블로그 앵커 리다이렉트 + 검색 로직

**Files:**
- Modify: `portfolio/index.html:15,22`
- Modify: `portfolio/about.html:5`
- Modify: `portfolio/project.html:5,9`
- Modify: `portfolio/games.html:5`
- Modify: `portfolio/contact.html:5`
- Modify: `portfolio/script.js:7-38`

**Interfaces:**
- Consumes: Task 1의 `baseurl: /blog` — 블로그 글 URL이 `/blog/<permalink>` 형태가 된다
- Produces: 포트폴리오 → 블로그 왕복 링크

- [ ] **Step 1: nav 일괄 수정**

`Blog` 링크를 `/blog/`로 바꾸고 `Search` 항목을 제거한다. 5개 파일의 nav는 `class="active"` 위치만 다르고 나머지는 동일하다.

```bash
cd /home/ubuntu/temp/portfolio
sed -i \
  -e 's|<a href="blog\.html">Blog</a>|<a href="/blog/">Blog</a>|g' \
  -e 's|<a href="search\.html">Search</a>||g' \
  index.html about.html project.html games.html contact.html
```

- [ ] **Step 2: 히어로 영역 링크 수정**

`index.html:22`의 "Blog 보기" 버튼.

```bash
cd /home/ubuntu/temp/portfolio
sed -i 's|<a class="secondary-link" href="blog\.html">|<a class="secondary-link" href="/blog/">|' index.html
```

- [ ] **Step 3: 프로젝트 카드 링크 수정**

`project.html:9`의 redis 글 카드. 대응하는 Jekyll 글은 `_posts/프로젝트/2024-06-11-1.md`이고 `permalink: /Project/redis1/`이므로 최종 URL은 `/blog/Project/redis1/`이다. 카테고리 배지는 삭제된 `category-project.html` 대신 블로그 카테고리 아카이브로 보낸다.

```bash
cd /home/ubuntu/temp/portfolio
sed -i \
  -e 's|href="posts/2024-06-11-project-redis-1\.html"|href="/blog/Project/redis1/"|g' \
  -e 's|href="category-project\.html"|href="/blog/categories/#project"|g' \
  project.html
```

- [ ] **Step 4: script.js에서 블로그 전용 로직 제거**

`script.js`의 7~38번째 줄(`postIndex` 선언, 블로그 앵커 리다이렉트, 검색 렌더러)을 삭제한다. `assets/js/posts-index.js`가 사라져 `window.POSTS_INDEX`가 항상 비고, 대상 DOM(`.search-form`, `#post-search`)도 `search.html`과 함께 사라졌기 때문이다.

변경 전 (1~14행 및 검색 블록):
```javascript
"use strict";

document.querySelectorAll("#current-year, .current-year").forEach((year) => {
  year.textContent = new Date().getFullYear();
});

// 포스트 인덱스는 assets/js/posts-index.js가 제공한다 (예전 lunr-store.js 대응).
const postIndex = Array.isArray(window.POSTS_INDEX) ? window.POSTS_INDEX : [];

// 예전 Blog 앵커 링크(blog.html#leetcode-131 등)를 포스트 페이지로 이어준다.
if (document.body.dataset.page === "blog" && window.location.hash.length > 1) {
  const target = postIndex.find((post) => post.id === decodeURIComponent(window.location.hash.slice(1)));
  if (target) window.location.replace(target.url);
}

const searchForm = document.querySelector(".search-form");
// ... renderResults 정의를 포함한 검색 블록 전체 (38행 `}` 까지)
```

변경 후 — 위 내용을 다음으로 대체한다. 즉 `"use strict";`와 연도 갱신 블록만 남기고, 그 아래 `const board = document.querySelector("#game-board");`로 바로 이어지게 한다.
```javascript
"use strict";

document.querySelectorAll("#current-year, .current-year").forEach((year) => {
  year.textContent = new Date().getFullYear();
});

const board = document.querySelector("#game-board");
```

`const board` 이후의 게임 로직(39행 이하)은 `games.html`이 사용하므로 그대로 둔다.

- [ ] **Step 5: 깨진 참조 없음 검증**

```bash
cd /home/ubuntu/temp/portfolio
echo "=== 삭제 대상 잔존 참조 (0이어야 함) ==="
grep -n 'blog\.html\|blog-[0-9]\|search\.html\|categories\.html\|category-\|posts/\|assets/\|POSTS_INDEX' \
  index.html about.html project.html games.html contact.html script.js
echo "=== /blog/ 링크 (nav 5 + 히어로 1 + 카드 3 = 9개) ==="
grep -o 'href="/blog/' index.html about.html project.html games.html contact.html | sort | uniq -c
```

Expected: 첫 grep은 출력 없음. 두 번째는 occurrence 기준 `index.html` 2, `about.html` 1, `project.html` 4, `games.html` 1, `contact.html` 1 — 합계 9.

`grep -c`는 줄 단위로 세므로 쓰지 않는다. `project.html`은 압축되어 있어 카드의 링크 3개(제목·카테고리 배지·읽기)가 한 줄에 몰려 있고, `grep -c`로는 2로 집계된다.

- [ ] **Step 6: 커밋**

```bash
cd /home/ubuntu/temp/portfolio
git add index.html about.html project.html games.html contact.html script.js
git commit -m "feat: nav의 Blog를 /blog/로 연결하고 삭제된 참조 정리

nav에서 Search 항목 제거, Blog는 Jekyll 블로그(/blog/)로 연결한다.
project.html의 redis 글 카드는 /blog/Project/redis1/ (Jekyll permalink)로,
카테고리 배지는 /blog/categories/#project로 돌린다.
script.js에서 posts-index.js에 의존하던 앵커 리다이렉트와 검색 로직을 제거한다."
```

---

### Task 5: 포트폴리오 — 루트 소유권 파일과 404

블로그가 `/blog/` 하위로 내려가면 루트에서 서빙되던 두 가지가 사라진다. Search Console 소유권 인증 파일은 루트에서 서빙되어야 유효하고, Jekyll의 `_pages/404.md`는 `/blog/` 하위에만 적용된다.

**Files:**
- Create: `portfolio/google037c167c6e0294fa.html` (블로그 레포에서 복사)
- Create: `portfolio/404.html`

- [ ] **Step 1: Search Console 인증 파일 복사**

```bash
cp /home/ubuntu/temp/blog/google037c167c6e0294fa.html \
   /home/ubuntu/temp/portfolio/google037c167c6e0294fa.html
cat /home/ubuntu/temp/portfolio/google037c167c6e0294fa.html
```

Expected: `google-site-verification: google037c167c6e0294fa.html` 형태의 한 줄

블로그 레포의 원본은 무해하므로 삭제하지 않는다.

- [ ] **Step 2: 404 페이지 작성**

`portfolio/404.html`을 만든다. 유지 페이지들과 같은 헤더 구조·`styles.css`를 쓴다.

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>페이지를 찾을 수 없습니다 | 이재원</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <header class="site-header"><a class="brand" href="/" aria-label="홈으로 이동">JW</a><nav aria-label="주요 메뉴"><a href="/">Home</a><a href="/about.html">About</a><a href="/blog/">Blog</a><a href="/project.html">Project</a><a href="/games.html">Games</a><a href="/contact.html">Contact</a></nav></header>
    <main>
      <section class="hero">
        <h1>404</h1>
        <p class="muted">요청하신 페이지를 찾을 수 없습니다.</p>
        <div class="link-row"><a class="primary-link" href="/">홈으로 <span aria-hidden="true">→</span></a><a class="secondary-link" href="/blog/">Blog 보기 <span aria-hidden="true">→</span></a></div>
      </section>
    </main>
  </body>
</html>
```

404 페이지는 임의 깊이의 경로에서 서빙되므로 링크와 자산 경로를 모두 루트 절대 경로(`/styles.css`, `/about.html`)로 쓴다. 다른 페이지들의 상대 경로와 다른 점에 주의한다.

- [ ] **Step 3: 커밋**

```bash
cd /home/ubuntu/temp/portfolio
git add google037c167c6e0294fa.html 404.html
git commit -F - <<'EOF'
feat: 루트 404 페이지와 Search Console 인증 파일 추가

블로그가 /blog/ 하위로 내려가면서 루트에서 사라지는 두 가지를 보완한다.
- Search Console 소유권 인증 파일은 루트에서 서빙되어야 유효하다
- Jekyll의 _pages/404.md는 이제 /blog/ 하위에만 적용된다

404.html은 임의 깊이 경로에서 서빙되므로 모든 경로를 루트 절대 경로로 작성했다.

재현 명령어:

  cp /home/ubuntu/temp/blog/google037c167c6e0294fa.html \
     /home/ubuntu/temp/portfolio/google037c167c6e0294fa.html

blog 레포의 원본 인증 파일은 삭제하지 않고 그대로 둔다.
EOF
```

---

### Task 6: 레포 rename과 배포

여기서 처음으로 외부에 보이는 URL이 바뀐다. Task 1~5의 커밋을 먼저 검토한 뒤 진행한다.

레포 이름이 서로 겹치므로 순서가 중요하다. 1단계에서 GitHub가 `jwlee3746.github.io` → `blog` 리다이렉트를 자동 생성하는데, 같은 소유자가 그 이름을 다시 쓰는 것은 허용되어 2단계에서 리다이렉트가 해제되고 이름이 넘어간다.

**Files:** 없음 (GitHub 원격 작업 + 브랜치 머지)

- [ ] **Step 1: 변경 사항 최종 검토**

```bash
git -C /home/ubuntu/temp/blog      log --oneline main..site-restructure
git -C /home/ubuntu/temp/portfolio log --oneline main..site-restructure
git -C /home/ubuntu/temp/blog      diff main..site-restructure --stat
git -C /home/ubuntu/temp/portfolio diff main..site-restructure --stat
```

Expected: 블로그 2커밋(Task 1, 2), 포트폴리오 5커밋(spec, plan, Task 3, 4, 5)

- [ ] **Step 2: 옛 이름 비우기**

```bash
gh repo rename blog --repo jwlee3746/jwlee3746.github.io --confirm
```

Expected: `✓ Renamed repository jwlee3746/blog`

- [ ] **Step 3: 포트폴리오가 이름 가져가기**

```bash
gh repo rename jwlee3746.github.io --repo jwlee3746/jwlee37463.github.io --confirm
```

Expected: `✓ Renamed repository jwlee3746/jwlee3746.github.io`

이름 충돌로 거부되면: `gh repo rename blog-tmp --repo jwlee3746/blog --confirm`로 예약을 털어낸 뒤 이 단계를 재시도하고, 성공 후 `gh repo rename blog --repo jwlee3746/blog-tmp --confirm`로 되돌린다.

- [ ] **Step 4: 로컬 remote 정리**

```bash
git -C /home/ubuntu/temp/portfolio remote set-url origin https://github.com/jwlee3746/jwlee3746.github.io.git
git -C /home/ubuntu/temp/blog      remote set-url origin https://github.com/jwlee3746/blog.git
git -C /home/ubuntu/temp/portfolio remote -v
git -C /home/ubuntu/temp/blog      remote -v
```

- [ ] **Step 5: main 머지 후 푸시 (배포 트리거)**

```bash
cd /home/ubuntu/temp/blog
git checkout main && git merge --ff-only site-restructure && git push origin main

cd /home/ubuntu/temp/portfolio
git checkout main && git merge --ff-only site-restructure && git push origin main
```

`--ff-only`가 실패하면 브랜치를 만든 뒤 원격 main이 앞서간 것이다. `git pull --rebase origin main` 후 재시도한다.

- [ ] **Step 6: 빌드 완료 대기 및 확인**

```bash
for i in $(seq 1 20); do
  p=$(gh api repos/jwlee3746/jwlee3746.github.io/pages --jq '.status' 2>/dev/null)
  b=$(gh api repos/jwlee3746/blog/pages --jq '.status' 2>/dev/null)
  echo "portfolio=$p blog=$b"
  [ "$p" = "built" ] && [ "$b" = "built" ] && break
  sleep 15
done
```

Expected: 양쪽 `built`. `errored`면 `gh api repos/<owner>/<repo>/pages/builds/latest --jq '.error.message'`로 원인을 확인한다.

---

### Task 7: 배포 검증과 후속 정리

**Files:** 없음 (원격 검증 + 레포 메타데이터)

- [ ] **Step 1: URL 응답 코드 확인**

```bash
for u in \
  https://jwlee3746.github.io/ \
  https://jwlee3746.github.io/about.html \
  https://jwlee3746.github.io/project.html \
  https://jwlee3746.github.io/games.html \
  https://jwlee3746.github.io/contact.html \
  https://jwlee3746.github.io/google037c167c6e0294fa.html \
  https://jwlee3746.github.io/blog/ \
  https://jwlee3746.github.io/blog/Paper/Attention1/ \
  https://jwlee3746.github.io/blog/Project/redis1/ \
  https://jwlee3746.github.io/blog/categories/ \
  https://jwlee3746.github.io/blog/search/ \
; do printf "%s %s\n" "$(curl -o /dev/null -sw '%{http_code}' "$u")" "$u"; done
```

Expected: 전부 `200`

- [ ] **Step 2: 블로그 자산이 /blog/ 기준으로 로드되는지 확인**

baseurl 누락 시 여기서 CSS가 깨진다.

```bash
curl -s https://jwlee3746.github.io/blog/ | grep -o 'href="[^"]*\.css"' | sort -u
```

Expected: `/blog/assets/css/...` 형태. `/assets/css/...`(blog 없음)면 baseurl이 적용되지 않은 것이다.

- [ ] **Step 3: 본문 이미지 경로 확인**

```bash
curl -s https://jwlee3746.github.io/blog/Paper/Attention1/ | grep -o 'src="[^"]*posts_img[^"]*"' | head -5
```

Expected: `https://jwlee3746.github.io/blog/assets/images/posts_img/...`

```bash
curl -o /dev/null -sw "%{http_code}\n" \
  https://jwlee3746.github.io/blog/assets/images/posts_img/2024-05-19-1/Encoder.png
```

Expected: `200`

- [ ] **Step 4: 상호 링크 동작 확인**

```bash
echo "=== 포트폴리오 → 블로그 ==="
curl -s https://jwlee3746.github.io/ | grep -o 'href="/blog/"'
echo "=== 블로그 → 포트폴리오 ==="
curl -s https://jwlee3746.github.io/blog/ | grep -o 'href="https://jwlee3746.github.io/[a-z.]*"' | sort -u
```

Expected: 포트폴리오에서 `/blog/` 링크 발견, 블로그에서 루트 및 `about.html` 링크 발견

```bash
echo "=== 공유 favicon ==="
curl -s https://jwlee3746.github.io/blog/ | grep -o 'rel="icon"[^>]*'
curl -o /dev/null -sw "%{http_code}\n" https://jwlee3746.github.io/blog/favicon.svg
```

Expected: `href="/blog/favicon.svg"`, 응답 `200`

- [ ] **Step 5: 404 동작 확인**

```bash
curl -o /dev/null -sw "%{http_code}\n" https://jwlee3746.github.io/nonexistent-page-check
curl -s https://jwlee3746.github.io/nonexistent-page-check | grep -o '<title>[^<]*</title>'
```

Expected: 코드 `404`, 타이틀에 "페이지를 찾을 수 없습니다"

- [ ] **Step 6: 레포 description 설정**

```bash
gh repo edit jwlee3746/jwlee3746.github.io \
  --description "이재원 포트폴리오 · 이력서 — https://jwlee3746.github.io/" \
  --homepage "https://jwlee3746.github.io/"
gh repo edit jwlee3746/blog \
  --description "Jaynote — 기술 블로그 (Jekyll) — https://jwlee3746.github.io/blog/" \
  --homepage "https://jwlee3746.github.io/blog/"
```

- [ ] **Step 7: 작업 브랜치 정리**

```bash
git -C /home/ubuntu/temp/blog      branch -d site-restructure
git -C /home/ubuntu/temp/portfolio branch -d site-restructure
```

- [ ] **Step 8: 수동 후속 조치 안내**

자동화하지 않고 사용자에게 안내할 항목이다.

- Google Search Console에 사이트맵 재제출: `https://jwlee3746.github.io/sitemap.xml`, `https://jwlee3746.github.io/blog/sitemap.xml`
- 이력서·GitHub 프로필·SNS에 기재된 링크를 `https://jwlee3746.github.io/`로 갱신
- 기존 블로그 글 URL은 `/blog/` 하위로 바뀌었다 (사용자 승인 사항, 리다이렉트 없음)

---

## 되돌리기

Task 6 이후 문제가 생기면 rename을 역순으로 되돌린다.

```bash
gh repo rename jwlee37463.github.io --repo jwlee3746/jwlee3746.github.io --confirm
gh repo rename jwlee3746.github.io --repo jwlee3746/blog --confirm
```

파일 변경은 각 레포에서 머지 커밋을 revert한다. 블로그의 `_config.yml`에서 `baseurl` 값을 비우면 루트 기준으로 돌아간다.
