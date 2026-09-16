# Jaewon Lee · Portfolio

콘텐츠는 JSON·Markdown, 문서 조립은 TypeScript, 스타일·브라우저 동작은 CSS·JavaScript로 관리합니다.
Eleventy로 생성한 `_site/`만 GitHub Pages에 배포합니다. Node.js 24 이상이 필요합니다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `data/site/` | 페이지 제목·설명, 내비게이션, 404 문구 |
| `data/profile/` | 화면별 프로필·소개·연락처 |
| `data/portfolio/` | 메인 경력·프로젝트·추천 글과 이력서 데이터 |
| `data/images/` | 프로필 사진과 글별 이미지 |
| `pages/portfolio/` | 메인 문서와 섹션 조립 |
| `pages/resume/` | 이력서 문서와 섹션 조립 |
| `pages/shared/`, `pages/404.11ty.ts` | 공통 렌더링 도구와 오류 페이지 |
| `theme/` | 화면별 CSS와 브라우저 JavaScript |
| `posts/` | 포스팅 Markdown 원본 |
| `public/` | favicon·사이트 인증 HTML·`.nojekyll` 등 그대로 복사할 파일 |
| `resume/` | 이력서 PDF와 편집 안내 |
| `scripts/` | 데이터 검증, PDF 생성, 빌드·검증 도구 |
| `_site/` | 자동 생성한 배포 결과. Git에서 제외 |

`pages/portfolio/index.11ty.ts`는 `/index.html`, `pages/404.11ty.ts`는 `/404.html`,
`pages/resume/index.11ty.ts`는 `/resume/index.html`을 생성합니다. 소스 위치와 공개 URL은 별개입니다.
`public/`의 파일은 배포 루트로 복사하므로 Google 인증 파일과 `/favicon.svg` 주소도 유지됩니다.

글 목록·블로그 테마 이전은 별도 PR에서 진행합니다. 가져온 글은 기존 `/blog/Algorithm/1208/` URL로
생성하며, 아직 이전하지 않은 `/blog/` 기능은 별도 저장소 `jwlee3746/blog`에서 제공합니다.
이 구조 변경 자체가 블로그 전체 이전을 완료하는 것은 아닙니다.

## 편집

- 메인 문구·목록: `data/profile/portfolio.json`, `data/portfolio/homepage.json`
- 메타데이터·메뉴·추천 링크: `data/site/portfolio.json`
- 404 문구: `data/site/error.json`
- 카드나 섹션의 HTML 구조: `pages/portfolio/sections/`
- 색상·레이아웃·모바일 메뉴: `theme/portfolio/`
- 이력서: [이력서 편집 가이드](resume/README.md)
- 데이터와 이미지 배치: [데이터 안내](data/README.md)

JSON의 문자열은 일반 텍스트로 이스케이프합니다. About의 강조만 `{ "strong": "강조할 내용" }`으로
표현하며 임의 HTML은 넣지 않습니다. 화면별 요약의 길이가 달라 메인과 이력서 데이터는 구분합니다.
미리보기 실행 중 JSON과 TypeScript 템플릿 변경도 자동으로 반영됩니다.

## 실행·검증

```sh
npm ci
npm run dev                    # http://localhost:8080/
npm run typecheck
npm test
npm run build                  # 이전 _site/를 비우고 전체 생성
npm run check:site             # URL·리소스·소스 제외 검사
npm run check:resume           # 생성된 이력서와 데이터 동기화 검사
```

빌드 결과를 별도로 확인하려면 `python3 -m http.server 8000 --directory _site`를 사용합니다.
저장소 루트에는 제공할 HTML이 없으므로 루트 HTTP 서버로 미리 보지 않습니다.

PDF는 Chrome/Chromium이 설치된 환경에서 `npm run build:resume:pdf`로 갱신합니다.
`bash scripts/install-resume-hook.sh`로 설치하는 훅은 이력서 원본을 검사하고 PDF를 갱신합니다.
생성 HTML은 `_site/resume/index.html`에만 쓰며 커밋하지 않습니다. 기존 훅은 재설치하세요.

## 배포 전환

이 변경은 이력서 구조화 PR #6을 기반으로 합니다. #6 머지 후 이 PR의 base를 main으로 바꿉니다.
루트 HTML을 제거하므로 기존 **Deploy from a branch → main / (root)** 방식으로 배포하면 안 됩니다.

1. PR의 `Site build and Pages / build` 검사와 로컬 화면·PDF를 검토합니다.
2. 이 PR을 main에 머지하기 직전에 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 전환합니다.
3. main에 머지합니다. 워크플로가 검증 후 `_site/` 아티팩트만 배포합니다.
4. `/`, `/404.html`, `/resume/`, PDF, Google 인증 URL과 기존 `/blog/` 링크를 확인합니다.

PR 이벤트는 검사만 실행합니다. 배포 작업은 main의 push 또는 main에서 수동 실행한 경우에만 실행됩니다.
이 PR을 작성하면서 저장소의 Pages 설정이나 현재 운영 배포는 변경하지 않습니다.
워크플로 구성은 [GitHub 공식 Pages 배포 액션](https://github.com/actions/deploy-pages)을 따릅니다.
