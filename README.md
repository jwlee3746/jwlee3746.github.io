# Jaewon Lee · Portfolio

콘텐츠는 JSON·Markdown, 문서 조립은 TypeScript, 스타일·브라우저 동작은 CSS·JavaScript로 관리합니다.
Eleventy로 생성한 `_site/`만 GitHub Pages에 배포합니다. Node.js 24 이상이 필요합니다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `theme.css` | 메인·404·블로그의 공통 화면 설정 |
| `data/home.json` | 메인 소개·경력 요약·프로젝트·메뉴·메타데이터 |
| `data/resume/` | 이력서 프로필·경력·학력·프로젝트·메타데이터 |
| `data/error.json` | 404 문구 |
| `data/images/` | 프로필 사진과 글별 이미지 |
| `ui/portfolio/` | 메인 템플릿·CSS·브라우저 JavaScript |
| `ui/resume/` | 이력서 템플릿·화면 및 인쇄 CSS |
| `ui/posts/` | 글 목록·본문 템플릿과 CSS |
| `ui/shared/`, `ui/404.11ty.ts` | 공통 렌더링 도구와 오류 페이지 |
| `data/posts/` | 포스팅 Markdown 원본 |
| `public/` | favicon·사이트 인증 HTML·`.nojekyll` 등 그대로 복사할 파일 |
| `jaewon-lee-resume.pdf` | 자동 생성한 이력서 PDF |
| `scripts/` | 데이터 검증, PDF 생성, 빌드·검증 도구 |
| `_site/` | 자동 생성한 배포 결과. Git에서 제외 |

`ui/portfolio/index.11ty.ts`는 `/index.html`, `ui/404.11ty.ts`는 `/404.html`,
`ui/resume/index.11ty.ts`는 `/resume/index.html`을 생성합니다. 소스 위치와 공개 URL은 별개입니다.
`public/`의 파일은 배포 루트로 복사하므로 Google 인증 파일과 `/favicon.svg` 주소도 유지됩니다.
`ui/`의 CSS·JavaScript는 기존 `/theme/` 주소로 배포합니다. TypeScript 템플릿은 배포하지 않습니다.

글 목록은 `/posts/`, 개별 글은 `/posts/<slug>/`, 분류는 `/categories/`, 태그는 `/tags/`로 생성합니다.
홈에서 같은 메뉴로 이동하며 `/blog/` 접두사를 사용하지 않습니다. 기존 주소는 새 주소로 이동시킵니다.
아직 이전하지 않은 글은 이 사이트에서 제공하지 않습니다.

## 편집

- 메인 문구·목록·메뉴·메타데이터: `data/home.json` (`profile`, `content`, `site`)
- 404 문구: `data/error.json`
- 카드나 섹션의 HTML 구조: `ui/portfolio/sections/`
- 메인·404·블로그 공통 화면 설정: 루트 [`theme.css`](theme.css)
- 웹폰트 다운로드 주소: `ui/shared/head.ts`의 `screenTheme()`
- 메인 레이아웃·모바일 메뉴: `ui/portfolio/`
- 404 레이아웃·버튼: `ui/shared/404.css`
- 이력서: `data/resume/`의 프로필·경력·학력·프로젝트 데이터
- 데이터와 이미지 배치: [데이터 안내](data/README.md)

JSON의 문자열은 일반 텍스트로 이스케이프합니다. About의 강조만 `{ "strong": "강조할 내용" }`으로
표현하며 임의 HTML은 넣지 않습니다. 화면별 요약의 길이가 달라 메인과 이력서 데이터는 구분합니다.
미리보기 실행 중 JSON과 TypeScript 템플릿 변경도 자동으로 반영됩니다.

## 메뉴·분류·검색

메인과 글 화면의 프로필·상단바·검색·푸터·모바일 메뉴는 `ui/shared/site-shell.ts`, `site-shell.css`, `site-shell.js`에서 함께 관리합니다.
이름 색상은 루트 `theme.css`의 `--color-profile-name`을 수정합니다.
HOME / POSTS 메뉴는 `ui/shared/navigation.ts`를 공유합니다.
하위 메뉴는 항상 표시하며 접기·펼치기 토글을 두지 않습니다. 홈에서는 스크롤 위치에 맞춰 목차를 강조합니다.
HOME의 목차는 `data/home.json`의 `site.sections`, POSTS의 분류·글 수는 Markdown에서 자동 생성합니다.

- 글의 `permalink`는 `/posts/<slug>/`로 지정합니다. 이전 주소가 있다면 `legacyUrl`에 남겨 자동 이동 페이지를 생성합니다.
- 글마다 `category` 하나를 지정합니다. 분류 목록을 별도 JSON에 중복 관리하지 않습니다.
- `tags`는 BERT·GAN 같은 세부 키워드입니다. 카테고리 이름을 태그에 중복 입력하지 않습니다.
- 분류별 목록은 `/categories/<분류 이름>/`, 태그 목록은 `/tags/`에 생성됩니다. 태그를 선택하면 해당 글만 있는 별도 페이지로 이동합니다.
- 태그별 주소 `/tags/tag-<base64url>/`는 한글·공백·특수문자를 구분하는 기존 태그 ID를 재사용합니다. 기존 `/tags/#tag-…` 링크는 해당 페이지로 이동하고, JavaScript가 없으면 태그 링크 위치로 이동합니다.
- 태그 목록의 글 수는 태그가 있는 글만 중복 없이 집계합니다. 태그 화면에서는 오른쪽 태그 목록을 반복 표시하지 않습니다.
- 전체 글 목록에서 제목·요약·본문·분류·태그를 검색합니다. 홈·글 본문·분류 화면에서도 같은 상단 검색창을 사용하며 전체 목록으로 연결됩니다.
- 전체·분류별 목록에는 글 수가 붙은 분류 바로가기를 표시합니다. 전체 목록의 오른쪽에는 태그만 표시합니다.
- 검색어는 입력 즉시 URL의 `q`에 반영합니다. 글을 읽고 뒤로 돌아오면 검색 조건과 브라우저의 스크롤 위치 복원을 유지합니다. 검색 결과에는 제목·요약에 없는 일치 태그나 본문 일부를 표시합니다.
- 본문 검색 데이터는 빌드 시 글 목록에 포함하며, 검색은 추가 요청 없이 브라우저에서 동작합니다. JavaScript가 없어도 전체 목록과 메뉴 링크는 사용할 수 있습니다.
- `excerpt`는 목록 카드에 표시합니다. 홈 추천 글·Featured에는 이전이 끝난 글만 연결합니다.
- `check:site`는 홈과 공통 메뉴·목록·보조 패널의 내부 링크 및 앵커가 실제 생성되었는지 검사합니다.

## 글 목차와 앵커

글의 front matter에 `toc: true`를 쓰면 빌드 시 목차를 생성합니다. 목차를 끈 글도 제목 앵커는 유지합니다.
`markdown-it-anchor`가 제목 ID·중복을 처리하고, `markdown-it-table-of-contents`가 그 ID로 중첩 목차를 만듭니다.
수식 제목은 목차에서도 KaTeX로 표시하며, 앵커는 원본 TeX를 사용해 기존 URL을 유지합니다.
브라우저 JavaScript는 필요하지 않습니다.

연결 설정은 `ui/posts/toc.ts`, 기존 HTML 제목·명시적 ID와의 호환 처리는 `ui/posts/html-headings.ts`에 있습니다.
일반 Markdown 제목은 렌더링 전 토큰으로 처리합니다. HTML 제목은 호환 어댑터가 플러그인에 전달하며,
본문의 명시적 ID는 자동 앵커와 충돌하지 않도록 예약합니다.

## 화면 설정 한눈에 보기

루트 [`theme.css`](theme.css)에서 글꼴, 주요 글자 크기·줄 높이, 색상, 사이드바·본문 너비,
섹션 여백, 모서리, 전환 시간, 코드 강조 색상을 조절합니다. 파일 안에 용도별 한국어 설명을 붙였습니다.
예를 들어 `--font-body`는 본문 글꼴, `--color-link`는 링크 색상, `--article-width`는 블로그 본문 너비입니다.

- `npm run dev` 실행 중 `theme.css`를 저장하면 미리보기에 자동 반영됩니다.
- 화면 CSS·JavaScript 주소에는 파일 내용으로 계산한 `?v=...`가 자동으로 붙습니다. 변경된 HTML이 이전 CSS·JS 캐시를 재사용하지 않게 하며 `theme.css` 원본과 배포 파일은 그대로 유지합니다.
- 메인·404·블로그 목록·본문·태그 페이지가 `/theme.css`를 함께 읽습니다. CSS를 그대로 복사하므로 `.env`나 변환 도구가 없습니다.
- 현재 웹폰트 로딩 주소는 공통 `ui/shared/head.ts`에 있습니다. 새로운 웹폰트를 쓰려면 로딩 주소와 `theme.css`의 글꼴 이름을 함께 변경하세요. 선택한 굵기도 해당 폰트에서 지원해야 합니다.
- 화면별 세부 배치와 모바일 전환 기준은 `ui/`의 CSS에 남깁니다. 일반 CSS 변수는 미디어쿼리 조건에 직접 사용할 수 없습니다.
- 이력서 화면·인쇄 및 KaTeX 수식 글꼴은 이 설정의 적용 대상이 아닙니다.
- 블로그의 사이드바·상단바·목록 카드도 공통 설정을 사용합니다. 메인의 본문 너비는 `--content-width`, 블로그의 본문 너비는 `--article-width`로 각각 조절합니다.

## 실행·검증

```sh
npm ci
npm run dev                    # http://localhost:8080/
npm run typecheck
npm test
npm run build                  # 이전 _site/를 비우고 전체 생성
npm run check:site             # URL·리소스·소스 제외 검사
npm run check:content          # 원본 프로젝트 식별자 재등장 검사 (build에서도 필수 실행)
npm run check:resume           # 생성된 이력서와 데이터 동기화 검사
```

빌드 결과를 별도로 확인하려면 `python3 -m http.server 8000 --directory _site`를 사용합니다.
저장소 루트에는 제공할 HTML이 없으므로 루트 HTTP 서버로 미리 보지 않습니다.

PDF는 Chrome/Chromium이 설치된 환경에서 `npm run build:resume:pdf`로 갱신합니다.
루트의 `jaewon-lee-resume.pdf`로 저장하며, 배포 시 기존 `/resume/jaewon-lee-resume.pdf` 주소로 복사합니다.
`bash scripts/install-resume-hook.sh`로 설치하는 훅은 이력서 원본을 검사하고 PDF를 갱신합니다.
생성 HTML은 `_site/resume/index.html`에만 쓰며 커밋하지 않습니다. 기존 훅은 재설치하세요.

## 배포 전환

루트 HTML을 제거하므로 기존 **Deploy from a branch → main / (root)** 방식으로 배포하면 안 됩니다.

1. PR의 `Site build and Pages / build` 검사와 로컬 화면·PDF를 검토합니다.
2. main에 머지하기 직전에 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 전환합니다.
3. PR의 base가 `main`인지 확인하고 머지합니다. 워크플로가 검증 후 `_site/` 아티팩트만 배포합니다.
4. `/`, `/404.html`, `/resume/`, PDF, Google 인증 URL과 기존 `/blog/` 링크를 확인합니다.

PR 이벤트는 검사만 실행합니다. 배포 작업은 main의 push 또는 main에서 수동 실행한 경우에만 실행됩니다.
이 PR을 작성하면서 저장소의 Pages 설정이나 현재 운영 배포는 변경하지 않습니다.
워크플로 구성은 [GitHub 공식 Pages 배포 액션](https://github.com/actions/deploy-pages)을 따릅니다.
