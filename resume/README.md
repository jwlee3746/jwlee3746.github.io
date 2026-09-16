# 이력서 편집

이력서는 **JSON 원본 → TypeScript 섹션 템플릿 → HTML → PDF** 순서로 생성합니다.
HTML은 `_site/resume/index.html`에 생성하고 Git에서 제외합니다. `resume/jaewon-lee-resume.pdf`만 배포용 산출물로 추적하며 직접 수정하지 않습니다.

## 준비

Node.js 24 이상과 Chrome/Chromium이 필요합니다. TypeScript는 [Node.js의 직접 실행 기능](https://nodejs.org/api/typescript.html)을 사용하며 타입 검사는 별도로 수행합니다. HTML 생성·타입 검사·테스트에는 브라우저가 필요하지 않습니다.

```sh
nvm use
npm ci
bash scripts/install-resume-hook.sh
```

## 어디를 수정하나요?

| 내용 | 원본 |
| --- | --- |
| 이름·직무·이메일·소개 | `data/profile/resume.json` |
| 페이지 제목·검색/공유 메타데이터 | `data/site/resume.json` |
| 경력 | `data/portfolio/experience.json` |
| 학력 | `data/portfolio/education.json` |
| 섹션 제목·프로젝트 그룹 | `data/portfolio/resume.json` |
| 개별 프로젝트 | `data/portfolio/projects/<slug>.json` |
| 전체 문서 틀 | `pages/resume/layout.ts` |
| 프로필·학력/경력·프로젝트 서식 | `pages/resume/sections/*.ts` |
| 화면·인쇄 스타일 | `theme/resume/resume.css` |

메인 포트폴리오의 요약 콘텐츠는 `data/portfolio/homepage.json`과 `data/profile/portfolio.json`에서 따로 관리합니다.

## 프로젝트 추가

1. `data/portfolio/projects/`의 기존 파일 하나를 복사해 `<slug>.json`으로 저장합니다.
2. 제목·기간·요약·기술·상세 항목을 작성합니다.
3. `group`과 `order`로 위치를 정한 뒤 빌드합니다. 별도 목록이나 TypeScript 코드를 수정할 필요가 없습니다.

```json
{
  "group": "platform",
  "order": 30,
  "title": "새 프로젝트",
  "start": "2026-09",
  "end": null,
  "stack": ["TypeScript"],
  "impact": "프로젝트에서 해결한 문제와 결과",
  "points": [
    { "label": "기여", "text": "직접 담당한 설계·구현 내용" }
  ]
}
```

- 파일명은 영문 소문자·숫자·하이픈으로 작성합니다. `.json` 파일은 자동으로 읽습니다.
- `group`은 `data/portfolio/resume.json`에 정의된 `core` 또는 `platform`입니다. 새로운 그룹도 해당 파일에 추가할 수 있습니다.
- 그룹과 그룹 내 프로젝트는 `order`가 작은 순서로 표시합니다. 프로젝트의 순서가 같으면 파일명으로 정렬합니다.
- `start`·`end`는 `YYYY-MM`이며, 진행 중이면 `end: null`을 사용합니다.
- `url`은 선택 항목입니다. `http://`·`https://` 링크를 넣으면 제목에 연결합니다.
- `visible: false`로 잠시 숨길 수 있습니다. 기본값은 `true`입니다. 삭제하려면 파일을 제거합니다.
- `points`는 필요한 만큼 추가합니다. 본문은 일반 텍스트이며 HTML은 그대로 표시되도록 이스케이프합니다.
- 학력·경력은 현재 진행 중인 항목을 먼저, 이후 종료일·시작일 최신순으로 정렬합니다.
- 필수 항목 누락, 오타 필드, 잘못된 날짜·링크·그룹은 파일 경로와 함께 오류로 표시합니다.

## 생성 및 검증

저장소 루트에서 실행합니다.

```sh
npm run build:resume       # JSON → _site/resume/index.html
npm run build:resume:pdf   # JSON → HTML → PDF 전체 갱신
npm run typecheck
npm test
npm run check:resume       # 빌드된 HTML이 원본과 같은지 확인
```

기존 `bash scripts/build-resume-pdf.sh` 명령도 전체 생성을 실행합니다.
Chrome이 자동으로 발견되지 않으면 `CHROME_PATH=/path/to/chrome npm run build:resume:pdf`를 사용합니다.
PDF 빌드는 임시 로컬 서버를 띄우고 완료 후 종료합니다. Google Fonts에 접근할 수 있어야 합니다.
PDF는 기존 정책대로 A4 1~3페이지를 검증합니다. 초과하면 마지막 정상 PDF를 보존하고 실패합니다.
프로젝트가 늘어날 때는 표시할 프로젝트를 선별하거나 내용을 조정하세요.

`npm run dev`로 사이트를 열고 `/resume/`에서 미리 볼 수 있습니다. 사이트 빌드와 미리보기는 Eleventy가 같은 렌더러를 호출합니다. JSON·템플릿 수정도 자동 반영됩니다.

## 커밋과 PR

훅은 데이터·템플릿·스타일·빌드 변경을 감지해 HTML과 PDF를 생성하고 PDF만 스테이징합니다.
스테이징하지 않은 관련 변경이나 새 프로젝트가 있으면 먼저 중단하므로, 커밋할 이력서 파일을 모두 스테이징하세요.
기존 훅 사용자는 설치 스크립트를 다시 실행해야 합니다.

PR에서는 타입 검사, 생성기 테스트, HTML과 데이터의 동기화를 확인합니다.
PDF의 폰트·페이지 수 검증은 로컬 PDF 빌드와 커밋 훅에서 수행합니다.
