# GitHub Pages 2개 레포 분리 설계

작성일: 2026-07-31
대상: `jwlee3746/jwlee37463.github.io`, `jwlee3746/jwlee3746.github.io`

## 배경

개인 사이트가 두 레포로 나뉘어 있으나 역할과 이름이 어긋나 있다.

| 레포 | 내용 | 현재 배포 URL | 생성일 |
|---|---|---|---|
| `jwlee37463.github.io` | 순수 HTML/CSS/JS 포트폴리오 (Home·About·Blog·Project·Search·Games·Contact) | `https://jwlee3746.github.io/jwlee37463.github.io/` | 2026-07-30 |
| `jwlee3746.github.io` | Jekyll + minimal-mistakes 기술 블로그 (Jaynote) | `https://jwlee3746.github.io/` | 2024-05-17 |

### 문제 1 — `jwlee37463.github.io` 이름은 아무 이득이 없다

GitHub는 `<username>.github.io`와 **정확히 일치**하는 레포만 User Page(루트 배포)로 취급한다.
`37463`은 username `jwlee3746`과 다르므로 이 레포는 일반 Project Page이고, 결과적으로
`jwlee3746.github.io/jwlee37463.github.io/` 라는 오타처럼 보이는 URL이 만들어진다.
이력서에 기재할 링크로 부적합하다.

### 문제 2 — 같은 글이 두 벌 존재한다

포트폴리오의 `posts/` 17개는 Jekyll `_posts` 17개의 정적 HTML 복제본이다. 날짜가 1:1로 대응한다.

| Jekyll 원본 | 포트폴리오 복제본 |
|---|---|
| `_posts/2024-05-08-1.md` | `posts/2024-05-08-sample-post.html` |
| `_posts/논문리뷰/2024-05-19-1.md` | `posts/2024-05-19-paper-attention-1.html` |
| `_posts/논문리뷰/2024-05-20-1.md` | `posts/2024-05-20-paper-attention-2.html` |
| `_posts/논문리뷰/2024-05-21-1.md` | `posts/2024-05-21-paper-attention-3.html` |
| `_posts/문제풀이/2024-05-22-1.md` | `posts/2024-05-22-leetcode-131.html` |
| `_posts/문제풀이/2024-05-23-1.md` | `posts/2024-05-23-leetcode-2597.html` |
| `_posts/문제풀이/2024-05-24-1.md` | `posts/2024-05-24-leetcode-1255.html` |
| `_posts/머신러닝/2024-05-24-2.md` | `posts/2024-05-24-ml-interview-math-statistics.html` |
| `_posts/문제풀이/2024-05-26-1.md` | `posts/2024-05-26-leetcode-1208.html` |
| `_posts/문제풀이/2024-05-27-1.md` | `posts/2024-05-27-leetcode-1404.html` |
| `_posts/문제풀이/2024-05-28-1.md` | `posts/2024-05-28-leetcode-1442.html` |
| `_posts/머신러닝/2024-05-29-1.md` | `posts/2024-05-29-mlops-pickle-serialization.html` |
| `_posts/머신러닝/2024-05-30-1.md` | `posts/2024-05-30-ml-interview-deeplearning.html` |
| `_posts/문제풀이/2024-05-31-1.md` | `posts/2024-05-31-leetcode-2024.html` |
| `_posts/머신러닝/2024-06-01-1.md` | `posts/2024-06-01-genmodel-variational-inference.html` |
| `_posts/논문리뷰/2024-06-02-1.md` | `posts/2024-06-02-paper-ddpm-1.html` |
| `_posts/프로젝트/2024-06-11-1.md` | `posts/2024-06-11-project-redis-1.html` |

두 곳에 글을 쓰면 "따로 관리"가 아니라 "이중 관리"가 된다.

## 목표 구조

| 역할 | 레포 이름 | URL | 스택 |
|---|---|---|---|
| 포트폴리오 + 이력서 | `jwlee3746.github.io` | `https://jwlee3746.github.io/` | 순수 HTML/CSS/JS |
| 기술 블로그 (Jaynote) | `blog` | `https://jwlee3746.github.io/blog/` | Jekyll + minimal-mistakes |

결정 근거:

- 루트는 포트폴리오가 차지한다. 이력서에 적는 링크가 가장 짧고 깔끔해진다.
- 글은 Jekyll 한 곳에서만 관리한다. 포트폴리오의 HTML 복제본은 제거한다.
- 기존 블로그 글 URL이 `/blog/` 하위로 내려가며 바뀌는 것은 감수한다 (사용자 결정).
- 커스텀 도메인은 도입하지 않는다.

## 작업 1 — 레포 rename

이름이 서로 겹치므로 **순서가 중요하다.**

```bash
# 1) 옛 이름을 먼저 비운다
gh repo rename blog --repo jwlee3746/jwlee3746.github.io

# 2) 그다음 포트폴리오가 그 이름을 가져간다
gh repo rename jwlee3746.github.io --repo jwlee3746/jwlee37463.github.io
```

1단계에서 GitHub가 `jwlee3746.github.io` → `blog` 리다이렉트를 자동 생성한다.
같은 소유자가 그 이름을 다시 사용하는 것은 허용되므로 2단계에서 리다이렉트가 해제되고 이름이 넘어간다.

2단계가 이름 충돌로 거부될 경우의 대비책: `blog` 레포를 임시 이름(`blog-tmp`)으로 한 번 더 rename해
예약을 완전히 털어낸 뒤, 2단계를 수행하고 `blog`로 되돌린다.

rename 후 로컬 clone의 remote를 정리한다.

```bash
git -C portfolio remote set-url origin https://github.com/jwlee3746/jwlee3746.github.io.git
git -C blog      remote set-url origin https://github.com/jwlee3746/blog.git
```

## 작업 2 — 포트폴리오 레포: 블로그 기능 제거

제거 대상 (총 14개 항목):

```bash
git -C portfolio rm -r posts
git -C portfolio rm blog.html blog-2.html blog-3.html blog-4.html
git -C portfolio rm categories.html
git -C portfolio rm category-algorithm.html category-computer-vision.html \
                    category-etc.html category-generative-model.html \
                    category-machine-learning.html category-mlops.html \
                    category-nlp.html category-paper.html category-project.html
git -C portfolio rm search.html
```

`search.html`은 자체 블로그 글 검색 전용이므로 함께 제거한다. 검색은 블로그 쪽 Jekyll 검색에 맡긴다.

유지: `index.html`, `about.html`(이력서), `project.html`, `games.html`, `contact.html`,
`assets/`, `styles.css`, `script.js`, `favicon.svg`

## 작업 3 — Search Console 인증 파일 이전

`google037c167c6e0294fa.html`은 현재 블로그 레포 루트에 있다.
소유권 인증 파일은 **사이트 루트에서 서빙되어야** 유효한데, 블로그가 `/blog/` 하위로 내려가면 인증이 깨진다.

```bash
cp blog/google037c167c6e0294fa.html portfolio/google037c167c6e0294fa.html
git -C portfolio add google037c167c6e0294fa.html
```

블로그 레포의 원본은 남겨둬도 무해하므로 삭제하지 않는다.

## 작업 4 — 블로그 레포: baseurl 설정

`_config.yml` 25번째 줄을 수정한다.

```yaml
url                      : "https://jwlee3746.github.io"   # 24행, 변경 없음
baseurl                  : "/blog"                          # 25행, 값 추가
```

minimal-mistakes는 내부 링크에 `relative_url` 필터를 일관되게 사용하므로 대부분 자동 해결된다.

**자동으로 해결되지 않는 것:** 본문 마크다운에 직접 작성한 `/assets/...` 형태의 절대 경로.
배포 후 실제 페이지를 열어 깨진 이미지·링크를 확인하고 개별 수정한다.

글들은 `permalink: /Paper/Attention1/` 같은 커스텀 permalink를 사용하므로
최종 주소는 `https://jwlee3746.github.io/blog/Paper/Attention1/` 형태가 된다.

## 작업 5 — 상호 연결

두 사이트의 스택이 다르므로(순수 HTML vs Jekyll 테마) 시각적 완전 통일은 비용 대비 효과가 낮다.
"같은 사람의 사이트"라는 신호 3가지만 공유한다.

1. **공유 favicon** — `favicon.svg`를 양쪽에 동일하게 배치
2. **공유 브랜드 마크** — 좌상단 `JW` 로고를 양쪽 헤더에 두고, 항상 포트폴리오 홈(`/`)으로 링크
3. **상호 왕복 링크**

### 포트폴리오 네비게이션

모든 페이지(`index.html`, `about.html`, `project.html`, `games.html`, `contact.html`)의 `<nav>`를 통일한다.

```
Home | About | Blog | Project | Games | Contact
```

`Blog` 항목의 href는 `/blog/`. 제거된 `Search` 항목은 nav에서 함께 삭제한다.

### 블로그 네비게이션

`_data/navigation.yml`의 `main` 섹션을 수정한다.

```yaml
main:
  - title: "Portfolio"
    url: https://jwlee3746.github.io/
  - title: "이력서"
    url: https://jwlee3746.github.io/about.html
  - title: "Search"
    url: /search/
  - title: "Project"
    url: /Project/
```

**주의:** 포트폴리오로 나가는 링크는 반드시 절대 URL로 작성한다.
`url: /` 처럼 상대 경로로 두면 `relative_url` 필터가 `baseurl`을 붙여 `/blog/`로 되돌아온다.

### 페이지 역할 중복 정리

블로그의 `_pages/`에는 `about.md`(`/about/`)와 `project.md`(`/Project/`)가 있고,
포트폴리오에도 `about.html`(이력서)과 `project.html`이 있어 두 쌍이 겹친다.

| 페이지 | 처리 |
|---|---|
| About | 이력서는 포트폴리오가 담당한다. 블로그의 `/about/`은 nav에서 내리고, 유지한다면 "블로그(Jaynote) 소개"로 성격을 분리한다. |
| Project | 프로젝트 소개는 포트폴리오가 담당한다. 블로그의 `/Project/`가 글 아카이브 성격이면 "Series" 등으로 이름을 바꿔 구분하고, 단순 소개면 nav에서 내린다. |

블로그 `_pages`의 md 파일 자체는 삭제하지 않는다. nav 노출만 조정해 되돌리기를 쉽게 둔다.
실제 처리는 각 페이지 내용을 열어보고 결정한다.

## 검증

레포별 Pages 빌드가 끝난 뒤 다음을 확인한다.

```bash
# 배포 상태
gh api repos/jwlee3746/jwlee3746.github.io/pages --jq '.status, .html_url'
gh api repos/jwlee3746/blog/pages --jq '.status, .html_url'

# 응답 코드
curl -o /dev/null -sw "%{http_code}\n" https://jwlee3746.github.io/
curl -o /dev/null -sw "%{http_code}\n" https://jwlee3746.github.io/about.html
curl -o /dev/null -sw "%{http_code}\n" https://jwlee3746.github.io/blog/
curl -o /dev/null -sw "%{http_code}\n" https://jwlee3746.github.io/blog/Paper/Attention1/
curl -o /dev/null -sw "%{http_code}\n" https://jwlee3746.github.io/google037c167c6e0294fa.html
```

체크 항목:

- 루트가 포트폴리오 Home으로 뜨는가
- 포트폴리오 nav의 `Blog`가 `/blog/`로 이동하는가
- 블로그 nav의 `Portfolio` / `이력서`가 루트 사이트로 나가는가
- 블로그 CSS·이미지가 `/blog/` 하위에서 정상 로드되는가 (baseurl 누락 시 여기서 깨진다)
- 포트폴리오에 블로그 잔재 링크(404)가 남아있지 않은가

## 후속 조치

- Google Search Console에 사이트맵 재제출 (`/sitemap.xml`, `/blog/sitemap.xml`)
- 루트 404 페이지 부재. 블로그가 루트에 있을 때는 Jekyll의 `_pages/404.md`가 루트 404를 담당했으나,
  블로그가 `/blog/` 하위로 내려가면 그 404는 `/blog/` 하위에만 적용된다.
  포트폴리오 레포 루트에 `404.html`을 추가한다 (없으면 GitHub 기본 404가 노출된다).
- 이력서·GitHub 프로필에 기재된 링크를 `https://jwlee3746.github.io/`로 갱신
- 두 레포에 `description` 설정 (현재 둘 다 비어 있음)

```bash
gh repo edit jwlee3746/jwlee3746.github.io --description "이재원 포트폴리오 · 이력서"
gh repo edit jwlee3746/blog --description "Jaynote — 기술 블로그 (Jekyll)"
```

## 되돌리기

rename은 역순으로 되돌릴 수 있다.

```bash
gh repo rename jwlee37463.github.io --repo jwlee3746/jwlee3746.github.io
gh repo rename jwlee3746.github.io --repo jwlee3746/blog
```

파일 변경은 각 레포의 커밋을 revert한다. `_config.yml`의 `baseurl`을 비우면 블로그가 루트 기준으로 돌아간다.
