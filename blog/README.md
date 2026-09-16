# Blog source

`https://jwlee3746.github.io/blog/`에서 제공하는 Jekyll 블로그의 원본입니다.
`jwlee3746/blog@1da29e0c9c8752da27dad01a979186d10bc44263`에서 전체 Git 이력을 보존하여 가져왔습니다.

## 유지하는 파일

- `_posts/`, `_pages/`, `assets/images/`: 글·페이지·본문 이미지
- `_config.yml`, `_data/`: URL·카테고리·내비게이션 설정
- `_layouts/`, `_includes/`, `_sass/`, `assets/css/`, `assets/js/`: 현재 화면과 검색을 재현하는 테마 소스
- `Gemfile`, `Gemfile.lock`: 블로그 빌드 의존성과 잠금 버전
- `LICENSE`: Minimal Mistakes 테마의 MIT 라이선스

테마 gem을 배포하기 위한 gemspec·Rake 작업, 과거 Travis CI, 테마 변경 이력과
소개용 스크린샷은 제거했습니다. 커스텀 파일을 구분해 기본 테마를 패키지로 대체하는 작업은 별도로 진행합니다.

## 공용 자산

저장소 루트의 `assets/`는 `/assets/`로 배포합니다. 블로그 사이드바의 프로필 사진도
`/assets/avatar.jpg`를 참조하므로 로컬 미리보기에서 운영 사이트의 사진을 요청하지 않습니다.
루트 `favicon.svg`가 유일한 아이콘 원본이며, 양쪽 사이트 모두 `/favicon.svg`를 참조합니다.

Jekyll을 `<출력>/blog/`로 빌드한 뒤 루트에서 아래 명령으로 공용 자산을 복사합니다.
통합 빌드도 이 단계를 사용해야 합니다. `build-check.sh`에는 이미 포함되어 있습니다.

```sh
bash scripts/copy-shared-assets.sh <출력>
```

기존 `/blog/favicon.svg`는 같은 원본에서 생성하는 호환 경로입니다.
공용 URL에는 `/blog`를 붙이는 `relative_url` 필터를 사용하지 않습니다.
블로그 전용 CSS·검색 JavaScript·본문 이미지는 계속 `blog/assets/`에서 관리합니다.

## 검증

저장소 루트에서 Docker로 실행합니다.

```sh
bash blog/build-check.sh
```

기존 Jekyll 3.9.3·Ruby Sass 3.7.4를 유지하며 `Gemfile.lock`에 고정한 의존성으로
전체 사이트를 빌드합니다. 주요 글·카테고리·검색 인덱스·다이어그램을 검사합니다.

원본 글의 `permalink`와 `baseurl: /blog`는 그대로 유지합니다.
이 소스 디렉터리를 그대로 공개하지 않고, 후속 통합 빌드에서 생성한 HTML·CSS·JS만 배포합니다.
