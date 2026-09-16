# Jaewon Lee · Portfolio

이재원의 개인 포트폴리오입니다. HTML, CSS, 바닐라 JavaScript로 구성하며,
빌드나 패키지 설치 없이 GitHub Pages에서 배포합니다.

## 파일 구조

| 경로 | 역할 |
| --- | --- |
| `index.html` | 메인 페이지 콘텐츠, 메타데이터, 구조화 데이터 |
| `assets/css/portfolio.css` | 다크 테마, 레이아웃, 컴포넌트, 반응형 스타일 |
| `assets/js/portfolio.js` | 섹션 위치 표시, 모바일 메뉴, 빈 검색 제출 방지 |
| `assets/avatar.jpg`, `assets/thumbs/` | 프로필 사진과 글 썸네일 |
| `resume/index.html` | 인쇄용 이력서. PDF 렌더링을 위해 자체 스타일 유지 |
| `resume/build-pdf.sh` | 이력서 PDF 생성 및 1~3페이지 범위 검증 |
| `resume/install-hook.sh` | 이력서 수정 시 PDF를 갱신하는 커밋 훅 설치 |
| `404.html` | 독립적인 오류 페이지 |

`/blog/`는 별도 저장소 `jwlee3746/blog`에서 배포합니다.

## 로컬 미리보기

저장소 루트에서 실행한 뒤 <http://localhost:8000/>을 엽니다.
리소스 경로가 `/assets/`로 시작하므로 HTML 파일을 직접 열지 말고 HTTP 서버를 사용합니다.

```sh
python3 -m http.server 8000
```

## 수정 및 확인

- 콘텐츠는 `index.html`, 화면 스타일은 `assets/css/portfolio.css`, 동작은
  `assets/js/portfolio.js`에서 수정합니다. JavaScript는 `defer`로 DOM 파싱 후 실행됩니다.
- 다크 테마를 유지합니다. CSS의 모바일 메뉴 경계(850px)는 JavaScript의 메뉴 닫기 조건과 맞춥니다.
- 데스크톱과 모바일에서 가로 넘침, 메뉴 열기·배경 클릭·링크 이동·화면 크기 변경,
  스크롤 시 섹션 표시, 빈 검색 차단을 확인합니다. 실제 블로그 검색 결과는 블로그 배포 환경에서 확인합니다.
- JavaScript 문법은 `node --check assets/js/portfolio.js`로 확인할 수 있습니다.
- 이력서를 수정하면 Chrome/Chromium이 설치된 환경에서 아래 명령으로 PDF를 갱신합니다.

```sh
bash resume/build-pdf.sh
```

클론 후 `bash resume/install-hook.sh`를 한 번 실행하면 이력서 HTML을 커밋할 때 PDF도 자동으로 갱신합니다.
