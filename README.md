# Jaewon Lee · Portfolio

이재원의 개인 포트폴리오입니다. HTML, CSS, 바닐라 JavaScript로 구성하며,
빌드나 패키지 설치 없이 GitHub Pages에서 배포합니다.

## 파일 구조

| 경로 | 역할 |
| --- | --- |
| `index.html` | 메인 페이지 콘텐츠, 메타데이터, 구조화 데이터 |
| `theme/portfolio/portfolio.css` | 다크 테마, 레이아웃, 컴포넌트, 반응형 스타일 |
| `theme/portfolio/portfolio.js` | 섹션 위치 표시, 모바일 메뉴, 빈 검색 제출 방지 |
| `data/images/profile/`, `data/images/site/` | 프로필 사진, 사이트 OG 이미지 |
| `data/images/posts/<slug>/` | 글별 썸네일·본문 이미지 |
| `theme/shared/` | 공용 화면 스타일. 현재 404 페이지 스타일 |
| `theme/resume/resume.css` | 이력서 화면·인쇄 스타일 |
| `theme/posts/` | 향후 글 목록·본문의 스타일·동작·템플릿 |
| `posts/` | 향후 포스팅 원본 |
| `data/site/` | 향후 사이트 메타데이터·내비게이션·카테고리 |
| `data/profile/` | 향후 이름·소개·연락처·외부 프로필 |
| `data/portfolio/` | 향후 경력·학력·프로젝트·추천 글 목록 |
| `resume/index.html` | 이력서 콘텐츠·문서 구조. PDF는 같은 디렉터리에 보관 |
| `scripts/build-resume-pdf.sh` | 이력서 PDF 생성 및 1~3페이지 범위 검증 |
| `scripts/install-resume-hook.sh` | 이력서 수정 시 PDF를 갱신하는 커밋 훅 설치 |
| `404.html` | 독립적인 오류 페이지 |

화면 표현은 `theme/`, 콘텐츠는 `posts/`·`resume/`·`data/`, 이미지는 `data/images/`,
관리 도구는 `scripts/`로 구분합니다. CSS·JS는 파일 형식별 디렉터리 대신 해당 화면 아래에 함께 둡니다.
현재 HTML의 문서 구조와 콘텐츠는 함께 유지하며, 블로그 템플릿은 이후 이전합니다.

데이터별 배치와 이미지 명명 규칙은 [data/README.md](data/README.md)에 정리했습니다.
`data/site/`, `data/profile/`, `data/portfolio/`는 아직 HTML에서 사용하는 데이터를 이전하기 위한 준비 공간입니다.

아직 비어 있는 `theme/posts/`, `posts/`, 위 데이터 디렉터리는 빈 `.gitignore`로 추적합니다.
이 파일들은 자리 표시용이며 앞으로 추가하는 콘텐츠를 무시하지 않습니다.

`/blog/`는 아직 별도 저장소 `jwlee3746/blog`에서 배포합니다. 루트 `blog/`나 사용하지 않는
Jekyll 설정은 만들지 않습니다. 통합 시 빌드가 위 소스를 Jekyll 구조로 조합하고 기존 URL을 유지합니다.
프로필 사진은 포트폴리오와 외부 블로그 모두 `/data/images/profile/avatar.jpg`를 사용합니다.
`favicon.svg`는 사이트 공통 진입 경로로 루트에 유지합니다.

## 로컬 미리보기

저장소 루트에서 실행한 뒤 <http://localhost:8000/>을 엽니다.
리소스 경로가 `/theme/`·`/data/images/` 등 절대경로이므로 HTML 파일을 직접 열지 말고 HTTP 서버를 사용합니다.

```sh
python3 -m http.server 8000
```

## 수정 및 확인

- 콘텐츠는 `index.html`, 화면 스타일은 `theme/portfolio/portfolio.css`, 동작은
  `theme/portfolio/portfolio.js`에서 수정합니다. JavaScript는 `defer`로 DOM 파싱 후 실행됩니다.
- 다크 테마를 유지합니다. CSS의 모바일 메뉴 경계(850px)는 JavaScript의 메뉴 닫기 조건과 맞춥니다.
- 데스크톱과 모바일에서 가로 넘침, 메뉴 열기·배경 클릭·링크 이동·화면 크기 변경,
  스크롤 시 섹션 표시, 빈 검색 차단을 확인합니다. 실제 블로그 검색 결과는 블로그 배포 환경에서 확인합니다.
- JavaScript 문법은 `node --check theme/portfolio/portfolio.js`로 확인할 수 있습니다.
- `resume/index.html` 또는 `theme/resume/`를 수정하면 Chrome/Chromium이 설치된 환경에서 아래 명령으로 PDF를 갱신합니다.

```sh
bash scripts/build-resume-pdf.sh
```

클론 후 `bash scripts/install-resume-hook.sh`를 한 번 실행하면 이력서 HTML 또는 스타일을 커밋할 때 PDF도 자동으로 갱신합니다.

기존 훅을 설치했다면 `bash scripts/install-resume-hook.sh`를 다시 실행해 호출 경로와 스타일 변경 감지를 갱신합니다.
