# 데이터 구조

사이트에서 보여 주는 데이터와 이미지를 관리합니다. 화면 표현과 동작은 `theme/`,
포스팅 본문은 루트 `posts/`, 이력서 문서와 PDF는 루트 `resume/`에 둡니다.

```text
data/
├── site/                       # 사이트 메타데이터·내비게이션·카테고리
├── profile/                    # 이름·소개·연락처·외부 프로필
├── portfolio/                  # 경력·학력·프로젝트·추천 글 목록
└── images/
    ├── profile/
    │   └── avatar.jpg
    ├── site/
    │   └── og-image.png
    └── posts/
        ├── attention-1/
        │   └── thumbnail.webp
        ├── attention-2/
        │   └── thumbnail.webp
        └── attention-3/
            └── thumbnail.webp
```

## 구조화 데이터

`site/`, `profile/`, `portfolio/`는 빈 `.gitignore`로 디렉터리만 준비합니다.
현재 사이트는 HTML 안의 콘텐츠를 사용하며 이 디렉터리를 자동으로 읽지 않습니다.
템플릿·빌드에 연결할 때 데이터를 이전하고, HTML과 데이터 파일에 같은 내용을 중복 관리하지 않습니다.

| 위치 | 이전할 데이터의 예 |
| --- | --- |
| `site/` | 사이트 제목·설명, 내비게이션, 카테고리 이름과 묶음 |
| `profile/` | 이름, 소개, 이메일, GitHub·LinkedIn 주소 |
| `portfolio/` | 경력, 학력, 프로젝트, 메인에서 소개할 글의 참조 |

실제 데이터가 생기면 해당 디렉터리의 자리 표시용 `.gitignore`는 제거해도 됩니다.
빈 `.gitignore`는 추가되는 파일을 무시하지 않습니다.

## 이미지

- 공통 프로필 사진은 `images/profile/`, 사이트 공유 이미지는 `images/site/`에 둡니다.
- 글 이미지는 `images/posts/<slug>/`에 모읍니다. 썸네일은 `thumbnail.webp`,
  본문 이미지는 `architecture.svg`처럼 내용을 나타내는 이름을 사용합니다.
- 디렉터리와 파일명은 영문 소문자·숫자·하이픈을 사용합니다.
- `<slug>`는 글을 식별하는 고정 이름입니다. 이 폴더 이름이 공개 글 URL을 바꾸지는 않습니다.
- 프로필 사진의 공개 주소는 `/data/images/profile/avatar.jpg`이며 포트폴리오와 별도 블로그가 공유합니다.
- 파일을 옮길 때 HTML·메타데이터·블로그의 참조 경로도 함께 갱신합니다.
