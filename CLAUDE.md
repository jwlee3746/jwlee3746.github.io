# jwlee3746.github.io

이재원(Jaewon Lee)의 개인 포트폴리오. GitHub Pages 정적 배포. 사이트는 Eleventy로 빌드하고, 이력서는 Node.js 24+의 TypeScript 생성기를 사용한다.

| 경로 | 내용 |
|---|---|
| `index.html` | 포트폴리오 메인 콘텐츠·메타데이터 (다크 전용) |
| `theme/portfolio/portfolio.css` | 메인 페이지 스타일·반응형 레이아웃 |
| `theme/portfolio/portfolio.js` | 스크롤 스파이·모바일 메뉴·검색 입력 처리 (바닐라 JS) |
| `theme/resume/resume.css` | 이력서 화면·인쇄 스타일 |
| `theme/shared/` | 공용 화면 스타일 (현재 404) |
| `theme/posts/`, `posts/` | 블로그 이전을 위한 빈 디렉터리. 빈 `.gitignore`로 추적 |
| `resume/index.html` | 자동 생성 HTML. 직접 편집하지 않는다 |
| `data/profile/resume.json`, `data/site/resume.json` | 프로필·소개와 페이지 메타데이터 |
| `data/portfolio/` | 학력·경력·프로젝트별 JSON·그룹 설정 |
| `theme/resume/layout.ts`, `theme/resume/sections/` | 문서 틀·섹션 템플릿 |
| `scripts/build-resume-html.ts`, `scripts/build-resume-pdf.ts` | 데이터 검증·HTML/PDF 생성 |
| `resume/jaewon-lee-resume.pdf` | 생성 산출물 |
| `scripts/build-resume-pdf.sh` | PDF 생성. 1~3페이지 범위를 벗어나거나 렌더가 잘못되면 실패로 끝난다 |
| `scripts/install-resume-hook.sh` | PDF 자동 재생성 pre-commit 훅 설치 (클론 후 1회) |
| `data/images/posts/<slug>/thumbnail.webp` | 글 섹션 썸네일 축소판 (256×160 WebP) |

화면 표현은 `theme/`, 콘텐츠는 `posts/`·`resume/`·`data/`, 이미지는 `data/images/`, 관리 도구는 `scripts/`에 둔다.
`data/site/`는 사이트 설정, `data/profile/`은 개인 프로필, `data/portfolio/`는 학력·경력·프로젝트 원본이다.
이력서는 이 데이터를 읽어 생성하며, 메인 페이지 콘텐츠는 아직 루트 HTML에 있다. 편집 절차는 `resume/README.md`를 따른다.
이미지는 `data/images/profile/`, `data/images/posts/<slug>/`로 나눈다. 상세 규칙은 `data/README.md`를 따른다.
빈 디렉터리의 `.gitignore`는 자리 표시용이며 내용은 비워 둔다.
같은 도메인의 `/blog/`는 아직 **별도 레포**(`jwlee3746/blog`, Jekyll)에서 서빙된다.
블로그 소스는 후속 이전에서 이 구조에 반영하며 루트 `blog/`를 만들지 않는다.
프로필 사진은 포트폴리오와 외부 블로그 모두 `/data/images/profile/avatar.jpg`를 사용한다.
사이트 공통 favicon 경로는 `/favicon.svg`로 유지한다.

## 작업 규칙

- 변경이 끝나면 **묻지 말고 바로 커밋·푸시**한다. Pages 배포에 시간 텀이 있어 승인 대기가 곧 배포 지연이다.
- 이력서 원본 데이터·`theme/resume/`·빌드 코드를 고치면 `npm run build:resume:pdf`로 HTML과 PDF를 함께 갱신한다. `npm run typecheck`, `npm test`, `npm run check:resume`도 통과해야 한다.
- 새 프로젝트는 `data/portfolio/projects/<slug>.json` 하나를 추가한다. `resume/index.html`은 직접 수정하지 않는다. 훅은 `bash scripts/install-resume-hook.sh`로 설치·갱신한다.
- 이력서는 **A4 1~3페이지** 안에서 프로젝트 근거와 가독성을 우선한다. 빌드 스크립트가 페이지 수를 검증한다.
- 인쇄에 영향을 주는 미디어쿼리는 `@media screen and (...)`으로 한정한다. 용지 폭(210mm)에 걸려 인쇄가 1컬럼으로 무너진 적이 있다.
- 포트폴리오는 **다크 모드 전용**이다. `<html data-theme="dark">`를 유지하며 테마 전환 버튼이나 저장 스크립트를 다시 추가하지 않는다.
- 레이아웃은 Chirpy 구조를 따른다: 260px 고정 사이드바, 중앙 콘텐츠 피드, 데스크톱 우측 보조 패널. 850px 미만에서는 사이드바를 오프캔버스로 전환한다.
- 프로필 사진은 GitHub 공개 프로필에서 받은 `data/images/profile/avatar.jpg`를 사용한다.
- **블로그 SCSS 는 Ruby Sass 로 빌드된다.** GitHub Pages 의 legacy 빌드는 `jekyll-sass-converter 1.5.2` 를 쓰고, 그 안은 dart-sass 도 libsass 도 아닌 **Ruby Sass 3.x** 다. 로컬 dart-sass 로 통과한 SCSS 가 배포에서 죽은 적이 두 번 있다.
  - `hsl(188deg 52% 18%)` — 공백 구분 표기를 **SassScript 로 평가되는 자리**(변수 대입, 일반 선언의 값)에서 못 읽는다. 커스텀 프로퍼티 값(`--x: hsl(...)`)은 통과된다.
  - `--wave: url("data:image/svg+xml,...")` — **커스텀 프로퍼티 값 안의 `url()`** 을 못 읽는다. 데이터 URI 는 SCSS 변수(`$wave`)로 두고 선언에 직접 쓴다.

  CSS 만 따로 컴파일해 보는 것으로는 이 둘을 못 잡는다. 고친 뒤에는 블로그 레포의 `bash build-check.sh` 로 **사이트 전체 빌드**를 재현해 확인한다(도커만 있으면 됨).
- 같은 토큰 값이 블로그 스킨(`jwlee3746/blog` 의 `_sass/minimal-mistakes/skins/_portfolio.scss`)에도 들어간다. 한쪽 색을 바꾸면 다른 쪽도 맞춘다.
- 포트폴리오를 떠나는 링크는 새 탭(`target="_blank" rel="noopener"`). 같은 페이지 앵커와 `mailto:`는 제외.

## TODO

### 1. 경력 성과 지표 채우기 (최우선)

현재 경력 기술이 "무엇을 했다"에서 끝나 규모·난이도·성과가 드러나지 않는다. 채용 담당자가 판단할 근거가 없어 실제보다 낮게 평가될 수 있다.

**반영 위치**: `index.html`의 경력 카드와 `data/portfolio/experience.json`·프로젝트 JSON. 이력서 HTML/PDF는 다시 생성한다.

채워야 할 숫자 (본인만 알 수 있는 정보. **절대 추정하거나 지어내지 말 것**):

- **모델 튜닝** — 튜닝한 모델의 규모/버전, 학습 데이터 규모, 개선한 지표와 개선 폭
- **평가 파이프라인** — 자동 평가 시나리오 수, 자동화 전후 소요 시간
- **에이전틱 플랫폼** — 통합한 도구 수, 처리 요청 규모(QPS/DAU), 태스크 성공률, latency
- **프롬프트·하네스** — 담당 범위(시나리오/도메인 수), 운영 규모

문장 템플릿 (대괄호를 실제 숫자로 교체):

```
Bixby LLM 평가 파이프라인 구축 — [N]개 시나리오 자동 평가, 수동 대비 [N]시간 → [N]분
에이전트 도구 호출 프레임워크 설계 — [N]개 도구 통합, 태스크 성공률 [N]%
```

기밀이라 숫자를 못 쓰는 항목은 상대적 표현(예: "평가 소요 시간을 1/10 수준으로 단축")으로 대체한다.

### 2. 학부 연구 시작 연도 확인

`index.html`·`resume/index.html` 모두 `2020 — 2023`으로 채웠다. 근거는 노션 아카이브에 남은
2020년 네이버 프로젝트 2건(쇼핑 이미지 분류 · 스니펫 QA)이다. 실제 시작 시점이 다르면 두 곳을 함께 고친다.

### 3. 세 표면의 역할 분담

프로젝트 케이스 스터디는 **블로그가 맡는다.** 한동안 이 레포에 `projects/*/index.html`로 상세 페이지를 두었으나, 날짜·카테고리·검색이 붙는 블로그 쪽이 글의 집이 맞다고 보고 전부 옮겼다.

- **이력서**: 경력과 프로젝트를 빠르게 훑을 수 있도록 한 줄 성과와 근거 bullet을 계층화
- **웹 포트폴리오(`index.html`)**: 목차 역할 — 카드 한 장에 핵심 수치까지만 담고 상세는 블로그로 넘긴다
- **블로그**: 문제→접근→결과 케이스 스터디, 설계 의사결정, 그림·표·원본 자료

카드에서 블로그로 나가는 링크는 `/blog/Project/<slug>/` 형태다.

### 4. 프로젝트 큐레이션

프로젝트 5개 중 4개가 학부 시절 비전/모바일 과제라 현직(LLM·에이전트)과의 연결이 약하다. 학부 것을 묶거나 줄이고 현재 전문성에 자리를 내주는 방향.

### 5. 폰트 전송량 (선택)

Google Fonts 한글 웹폰트가 32개 파일 494KB로 전송된다. `&text=` 서브셋을 쓰면 4개 114KB로 줄지만, 콘텐츠를 바꿀 때마다 URL의 글자 목록을 갱신해야 하고 빠뜨리면 그 글자만 조용히 다른 폰트로 바뀐다. 적용하려면 글자 목록 자동 갱신 스크립트를 함께 만들 것.
