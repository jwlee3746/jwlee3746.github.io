# 데이터 구조

사이트에서 보여 주는 데이터와 이미지를 관리합니다. 문서 조립·스타일·브라우저 동작은 화면별 `ui/`,
포스팅 본문은 `data/posts/`, 이력서 PDF는 루트 `jaewon-lee-resume.pdf`에 둡니다. 생성 HTML은 `_site/`에만 둡니다.

```text
data/
├── home.json                   # 메인 소개·본문·메뉴·메타데이터
├── error.json                  # 404 문구
├── resume/                     # 이력서 데이터
│   ├── profile.json            # 이름·직무·연락처·소개
│   ├── site.json               # 페이지 제목·설명·공개 URL
│   ├── experience.json         # 경력
│   ├── education.json          # 학력
│   ├── sections.json           # 섹션 제목·프로젝트 그룹
│   └── projects/               # 프로젝트별 JSON
├── posts/                      # 포스팅 Markdown 원본
└── images/
    ├── profile/
    │   └── avatar.jpg
    └── posts/
        ├── attention-1/
        │   └── thumbnail.webp
        ├── attention-2/
        │   └── thumbnail.webp
        └── attention-3/
            └── thumbnail.webp
```

## 구조화 데이터

메인은 `home.json` 하나에서 수정합니다. `site`는 제목·설명·메뉴·링크,
`profile`은 이름·직무·소개, `content`는 본문·경력 요약·프로젝트·추천 글을 담습니다.
이력서는 `resume/` 안에서 수정합니다. 새 프로젝트는 `resume/projects/<slug>.json`으로 추가하면
자동으로 포함됩니다. 프로젝트의 `group`은 `resume/sections.json`에 정의된 그룹을 사용합니다.
404 문구는 `error.json`에서 관리합니다. 화면별 문구 길이가 다르므로 메인과 이력서의 요약은 구분합니다.
생성된 HTML과 PDF는 직접 편집하지 않습니다.
생성·검증 명령은 [루트 README](../README.md#실행검증)를 참고하세요.

| 위치 | 데이터의 예 |
| --- | --- |
| `posts/` | 포스팅 Markdown 원본 |
| `home.json` | 메인 소개·본문·메뉴·메타데이터 |
| `resume/` | 이력서 프로필·경력·학력·프로젝트 |
| `error.json` | 404 제목·문구·링크 |

실제 데이터가 생기면 해당 디렉터리의 자리 표시용 `.gitignore`는 제거해도 됩니다.
빈 `.gitignore`는 추가되는 파일을 무시하지 않습니다.

## 이미지

- 공통 프로필 사진은 `images/profile/`에 둡니다.
- 글 이미지는 `images/posts/<slug>/`에 모읍니다. 썸네일은 `thumbnail.webp`,
  본문 이미지는 `architecture.svg`처럼 내용을 나타내는 이름을 사용합니다.
- 디렉터리와 파일명은 영문 소문자·숫자·하이픈을 사용합니다.
- `<slug>`는 글을 식별하는 고정 이름입니다. 이 폴더 이름이 공개 글 URL을 바꾸지는 않습니다.
- 프로필 사진의 공개 주소는 `/data/images/profile/avatar.jpg`이며 포트폴리오와 별도 블로그가 공유합니다.
- 파일을 옮길 때 HTML·메타데이터·블로그의 참조 경로도 함께 갱신합니다.

## 포스팅 분류

`posts/YYYY-MM-DD-slug.md`의 front matter에 다음처럼 작성합니다.

```yaml
category: "Project"
tags: ["GAN", "Metric Learning"]
excerpt: "목록에서 보여 줄 글 요약"
```

`category`는 하나의 큰 분류, `tags`는 세부 키워드입니다. 분류 이름에 `/`, `\`, `?`, `#`는 쓰지 않습니다.
실제 글이 있는 분류와 글 수만 메뉴에 자동 반영됩니다. 공개 주소는 `permalink: /posts/<slug>/`로 지정합니다. 기존 `/blog/.../` 주소는 `legacyUrl`에 남기면 새 글 주소로 이동합니다.
홈의 추천 글과 Featured 링크는 `home.json`에서 관리하며 아직 이전하지 않은 글은 노출하지 않습니다.
