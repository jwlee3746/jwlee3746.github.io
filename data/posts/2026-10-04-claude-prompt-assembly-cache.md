---
title: '[Agent] Claude Code의 프롬프트 조립과 캐시: payload에서 멀티턴까지'
excerpt: 프롬프트가 system·messages·tools로 조립되는 구조부터 단일 턴과 멀티턴의 payload, 로컬 캐시와 API 캐시, LangChain·Deep Agents의 변환 계층까지 정리합니다.
date: '2026-10-04'
category: Agent
tags:
- Claude Code
- Prompt Caching
- Context Engineering
- LangChain
- Deep Agents
permalink: /posts/claude-prompt-assembly-cache/
toc: true
---

**에이전트의 프롬프트는 한 개의 긴 문자열이 아니다. 지침, 대화 이력, 도구 정의를 조립한 요청이며, 캐시는 그 요청의 변하지 않는 앞부분을 재사용한다.**

- 출발점: Claude Code의 프롬프트 조립 경로와 실행 구조를 읽으며 생긴 질문들.
- 범위: 개별 지침 파일의 문장보다, **어디에 들어가고 언제 바뀌며 어떻게 재사용되는지**에 집중한다.
- 구성: 조립 구조 → 실행 토폴로지 → 요청 payload → 단일·멀티턴 → 두 종류의 캐시 → 제공사와 프레임워크 비교.

> 2026년 10월 4일 정리. 구현 분석에서 확인한 구조는 역할 중심으로 일반화했으며 내부 파일 경로와 식별자는 싣지 않았다. 다이어그램과 payload는 설명용 재구성으로, 실제 실행 로그나 네트워크 캡처가 아니다. 구현 관찰과 공개 API 계약을 구분하고, 현재 제품의 모든 실행 모드에 같은 동작을 보장하지 않는다.

## 프롬프트는 세 경로로 조립된다

![기본 지침은 system, 프로젝트 문맥과 대화는 messages, 도구 정의는 tools로 합류하고 도구 실행 결과가 대화 루프로 돌아가는 조립 구조](/data/images/posts/claude-prompt-assembly-cache/prompt-assembly.svg)

그림 1. 프롬프트 조립 구조. 그림을 누르면 확대할 수 있다. [인터랙티브 조립 구조도](/diagrams/claude-prompt-assembly-cache/prompt-assembly.html)에서는 system·messages·tools 경로를 따로 선택할 수 있다.

| 요청 필드 | 주요 입력 | 조립 과정 |
| --- | --- | --- |
| `system` | 기본 행동 지침, 선택한 실행 모드의 지침, 환경·저장소 문맥 | 지침 선택 → 세션 문맥 추가 → text 블록과 캐시 경계 구성 |
| `messages` | 초기 프로젝트 문맥, 사용자 입력, 이전 답변, 도구 결과, 동적 알림 | 이력 준비·필요시 압축 → 문맥 앞삽입 → API 메시지 정규화 |
| `tools` | 내장 도구와 외부 도구의 설명·입력 스키마 | 사용 가능한 집합 결정 → 필터링·지연 로딩 → API 스키마 변환 |

**지침의 출처와 API에서의 역할은 별개다.**

- 분석한 경로에서는 초기 `CLAUDE.md` 내용과 날짜를 **user 역할의 문맥**으로 대화 앞에 넣는다.
- 호출한 스킬 본문도 일반 실행 경로에서는 사용자 메시지로 확장된다. 별도 에이전트에서 실행하는 분기는 구분해야 한다.
- `<system-reminder>`는 본문 안의 구분용 태그다. 그 이름이 메시지를 API의 `system` 역할로 바꾸지는 않는다.
- 도구의 사용 원칙은 지침에 들어갈 수 있지만, 도구의 이름·설명·입력 스키마는 별도 `tools` 필드에도 전달된다.
- 대화형 실행과 SDK 실행, 사용자 지정 지침, 하위 에이전트에 따라 기본 지침의 선택·교체·추가 방식이 달라질 수 있다.

여기서 `system`은 서버에 한 번 등록하는 전역 설정이 아니다. **이번 모델 요청에 적용할 시스템 지침을 담는 필드**다. 같은 필드를 반복해서 보내는 비용을 줄이는 일은 별도의 프롬프트 캐시가 담당한다. [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages)

## 실행 토폴로지: 메인과 하위 에이전트가 같은 API 계층을 사용한다

![대화형·SDK 진입점, 메인 대화 루프, 도구 실행, 스킬 본문 확장, 하위 에이전트와 공통 모델 API 계층의 연결 구조](/data/images/posts/claude-prompt-assembly-cache/runtime-topology.svg)

그림 2. 호출 방향을 표시한 실행 토폴로지. 반환 결과는 호출한 루프로 돌아간다. [인터랙티브 실행 토폴로지](/diagrams/claude-prompt-assembly-cache/runtime-topology.html)에서도 연결 관계를 탐색할 수 있다.

| 실행 경로 | 준비하는 문맥 | 모델 호출 이후 |
| --- | --- | --- |
| 메인 루프 | 선택한 지침, 대화 이력, 현재 도구 집합 | 답변을 내보내거나 도구를 실행하고 다시 요청 |
| 독립 하위 에이전트 | 전용 지침과 환경 정보, 별도 작업 메시지, 허용된 도구 | 자체 이력으로 작업한 결과를 부모에 반환 |
| 부모 문맥을 상속하는 하위 실행 | 부모의 지침·이력·도구 집합을 전달하는 경로 | 공통 prefix 재사용 가능성을 유지하며 별도 작업 수행 |
| 스킬 실행 | 스킬 본문과 관련 문맥 | 현재 대화에 넣거나 별도 실행 경로로 분기 |

- 위임 방식에 따라 **같은 모델이라도 실제 입력이 달라진다.**
- 부모의 지침만 복사하고 도구 스키마나 대화 순서를 바꾸면 동일한 캐시 prefix라고 볼 수 없다.
- 모델 이름, 도구 정의, 실행 설정과 대화 이력은 함께 확인해야 한다.

## 모델 API 호출 직전의 payload

**최종 요청에서는 지침·도구·대화가 각각의 필드로 합류한다.** 아래는 공개 Anthropic API 형태를 사용하는 설명용 예시다.

- 모델 이름과 출력 토큰 수는 자리표시자·예시값이다.
- 지침 본문과 도구 스키마는 축약했다. 그대로 실행하는 예제가 아니다.
- 식별용 메타데이터, thinking, beta 설정, 출력 형식, 재시도·캐시 편집 등의 선택 필드는 생략했다.
- 캐시 마커는 정적 부분과 대화 끝을 구분해 보여 주기 위한 배치다. 특정 실행 모드의 요청을 그대로 복사한 것은 아니다.

```json
{
  "model": "<선택한 모델 ID>",
  "max_tokens": 8192,
  "stream": true,
  "tools": [
    {
      "name": "read_file",
      "description": "지정한 파일의 내용을 읽는다.",
      "input_schema": {
        "type": "object",
        "properties": {
          "path": { "type": "string" }
        },
        "required": ["path"]
      }
    }
  ],
  "system": [
    {
      "type": "text",
      "text": "<기본 행동·작업 수행·도구 사용·출력 원칙>",
      "cache_control": { "type": "ephemeral" }
    },
    {
      "type": "text",
      "text": "<세션의 환경·언어·메모리 사용 안내·추가 지침>"
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "<system-reminder>초기 프로젝트 지침과 날짜</system-reminder>"
        },
        {
          "type": "text",
          "text": "이 프로젝트의 구조를 설명해줘.",
          "cache_control": { "type": "ephemeral" }
        }
      ]
    }
  ]
}
```

- 초기 문맥과 사용자 입력은 내부에서 따로 생성되어도 API 정규화 단계에서 연속된 user 메시지로 병합될 수 있다.
- 도구 결과·첨부의 변환과 도구 호출/결과의 짝 맞춤도 최종 전송 전에 수행한다.
- 이 경로는 매번 본문을 포함해 보낸다. **서버 캐시가 적중하더라도 클라이언트가 입력 본문을 생략하는 것은 아니다.**
- 제공사 전체의 공통 제약은 아니다. 예를 들어 Gemini에는 명시적 캐시 리소스를 참조하는 별도 방식도 있다. [Gemini 콘텐츠 캐시](https://ai.google.dev/gemini-api/docs/caching)

## 단일 턴과 멀티턴은 요청 형식이 같다

**대화가 길어져도 필드 구조는 유지되고, 주로 `messages`의 뒤쪽이 늘어난다.**

| 시점 | 요청에 포함하는 대화 | 이전 요청과 공유 가능한 부분 |
| --- | --- | --- |
| 첫 사용자 질문 | 초기 문맥 + 질문 1 | 이미 같은 prefix의 캐시가 있을 때만 재사용 가능 |
| 두 번째 사용자 질문 | 초기 문맥 + 질문 1 + 답변 1 + 질문 2 | 이전 요청의 초기 문맥과 질문 1까지 |
| 세 번째 사용자 질문 | 기존 이력 + 답변 2 + 질문 3 | 두 번째 요청의 prefix까지 |

- 첫 요청도 캐시 생성용 마커를 보낼 수 있다. **마커가 있다는 사실과 캐시 적중은 다르다.**
- 직전 답변은 이전 요청에서는 출력이었다. 다음 요청에서 처음 입력 이력으로 들어간다.
- 다음은 두 번째 질문 시점의 `messages` 예시다. `system`과 `tools`가 유지된다고 가정한다.

```json
[
  {
    "role": "user",
    "content": [
      { "type": "text", "text": "<초기 프로젝트 문맥>" },
      { "type": "text", "text": "이 프로젝트의 구조를 설명해줘." }
    ]
  },
  {
    "role": "assistant",
    "content": [{ "type": "text", "text": "<첫 번째 답변>" }]
  },
  {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "프롬프트 조립 부분을 자세히 설명해줘.",
        "cache_control": { "type": "ephemeral" }
      }
    ]
  }
]
```

분석한 일반 요청 경로는 **마지막 메시지의 마지막 콘텐츠 블록에 메시지용 마커 하나를 붙이는 방식**이었다. 이전 요청의 마커를 이력 전체에 계속 쌓는 방식과는 다르다.

- 일부 보조 실행은 공유하는 이력까지만 캐시 대상으로 삼기 위해 끝에서 두 번째 메시지에 경계를 둔다.
- thinking 블록, 추가 첨부, 캐시 편집과 같은 예외는 별도 처리한다.
- 이것은 해당 구현의 전략이다. 공개 API에는 요청 최상위에 `cache_control`을 두고 경계를 자동으로 이동시키는 방식도 있다. [Anthropic 자동 캐싱](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#automatic-caching)

## 사용자 턴 하나가 API 호출 여러 번이 될 수 있다

![질문을 받은 실행 루프가 모델을 호출하고 도구 요청을 실행한 뒤 결과를 포함해 다시 모델을 호출하는 시퀀스](/data/images/posts/claude-prompt-assembly-cache/turn-sequence.svg)

그림 3. 사용자 입력은 한 번이지만 모델 요청은 A와 B 두 번이다. 도구 호출이 반복되면 같은 패턴이 이어진다.

| 경우 | 다음 모델 요청에 추가하는 내용 |
| --- | --- |
| 단일 턴, 도구 사용 없음 | 답변으로 종료하면 후속 요청 없음 |
| 단일 턴, 도구 사용 | 모델의 `tool_use`와 실행 결과인 `tool_result` |
| 멀티턴 | 이전 assistant 답변과 새 user 입력 |

**도구 실행 후 재호출에서는 다음 두 메시지를 기존 이력 뒤에 추가한다.**

```json
[
  {
    "role": "assistant",
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_example",
        "name": "read_file",
        "input": { "path": "/project/main.py" }
      }
    ]
  },
  {
    "role": "user",
    "content": [
      {
        "type": "tool_result",
        "tool_use_id": "toolu_example",
        "content": "<파일 내용>",
        "cache_control": { "type": "ephemeral" }
      }
    ]
  }
]
```

- 실제 재요청에는 위 조각뿐 아니라 앞선 전체 이력도 포함된다.
- 호출 ID와 결과의 참조 ID가 대응해야 한다.
- 도구 결과 뒤에 추가 알림 블록이 붙는다면 마지막 캐시 마커 위치도 달라질 수 있다.
- **단일 턴이라고 캐시가 쓸모없는 것은 아니다.** 한 사용자 턴 안의 반복 호출에서도 공통 prefix가 생긴다. [도구 호출과 프롬프트 캐시](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-use-with-prompt-caching)

## 로컬 캐시와 API 프롬프트 캐시는 다른 일을 줄인다

**로컬 캐시는 프롬프트를 만드는 작업을, API 캐시는 모델이 반복 입력을 처리하는 작업을 줄인다.**

| 기준 | 로컬 캐시 | API 프롬프트 캐시 |
| --- | --- | --- |
| 위치 | 에이전트 프로세스 메모리 | 모델 API 서버 |
| 저장 대상 | 조립한 지침 문자열·문맥·도구 스키마 | 입력 prefix를 처리한 모델의 계산 상태 |
| 주요 효과 | 파일 읽기·문자열 생성·스키마 변환 반복 감소 | 반복 입력의 연산·지연·비용 감소 |
| 제어 | 메모이제이션, 세션별 자료구조 | 제공사의 캐시 옵션과 일치 조건 |
| 유효 기간 | 캐시 종류별 세션·초기화 시점 | TTL과 제공사 정책 |
| 다음 요청 | 저장된 문자열로 payload 구성 | 받은 prefix가 기존 캐시와 일치하면 재사용 |

```text
첫 요청
파일·설정 읽기 → 문맥 조립 → payload 전송 → 모델 입력 처리
                 ↓ 로컬 보관                ↓ 서버 캐시

다음 요청
저장된 문맥 재사용 ───────→ payload 전송 → 같은 prefix 계산 재사용
```

- 로컬 캐시 적중이 API 캐시 적중을 보장하지 않는다. 서버 TTL이 지났거나 도구·지침·이력이 달라졌을 수 있다.
- 로컬에서 매번 다시 만들어도 결과 prefix가 같다면 서버 캐시를 재사용할 수 있다.
- 로컬 캐시는 성능 외에도 **프롬프트 문자열을 안정적으로 유지하는 역할**을 한다.
- 특히 도구 설명과 스키마를 세션 동안 고정하면, 중간 설정 변화가 요청 앞부분을 불필요하게 바꾸는 일을 줄일 수 있다.

서버 캐시의 계산 상태와 캐시 토큰 관측은 [OpenAI 프롬프트 캐시 문서](https://developers.openai.com/api/docs/guides/prompt-caching)에서도 설명한다. 이 개념과 클라이언트의 문자열 캐시는 별개의 계층이다.

## 정적·동적 분리는 변경 주기를 기준으로 읽는다

**동적이라는 이름은 매 요청마다 다른 문자열이라는 뜻도, 캐시할 수 없다는 뜻도 아니다.**

| 구성 요소 | 변하는 시점 | 배치·재사용 전략 |
| --- | --- | --- |
| 기본 행동·도구 사용 원칙 | 버전·실행 모드·기능 구성 변경 | 앞쪽의 안정적인 지침으로 배치 |
| 환경·언어·출력 스타일·메모리 안내 | 세션이나 설정 변경 | 처음 계산한 내용을 가능한 한 재사용 |
| 초기 프로젝트 지침·날짜 | 세션 초기화 또는 재구성 | 대화 앞부분의 문맥으로 유지 |
| 새 입력·도구 결과 | 각 모델 재호출 | 기존 이력 뒤에 추가 |
| 날짜·외부 도구 안내 변경 | 실행 도중 상태 변경 | 지원 경로에서는 변경 알림을 뒤에 추가 |

- 분석한 경로에서는 세션별 섹션도 대개 재사용하며, 대화 초기화·압축 등에서 다시 계산할 수 있다.
- 외부 도구 서버가 연결·해제되며 바뀌는 안내처럼 매번 확인해야 하는 예외가 있다.
- 이를 시스템 지침에 다시 쓰는 대신 **변경분을 대화 뒤에 기록**하는 경로도 있다.
- 날짜가 바뀌었을 때 초기 날짜를 덮어쓰기보다 뒤에 새 날짜를 알리면, 기존 prefix를 유지할 수 있다.
- 외부 파일을 수정했다고 이미 만들어 둔 초기 문맥이 곧바로 갱신된다고 가정하면 안 된다. 문맥의 재로딩 시점과 서버 캐시의 만료는 서로 다른 문제다.

정적·동적 섹션을 논리적으로 나누는 것과 API의 text 블록을 나누는 것도 구분해야 한다.

| 관찰한 조건부 경로 | 시스템 지침을 다루는 방식 |
| --- | --- |
| 정적 지침을 더 넓은 범위에서 재사용하는 경로 | 정적 지침 끝에 경계를 두고 세션별 지침을 뒤에 배치 |
| 사용자별 외부 도구 때문에 공유를 제한하는 경로 | 일반 범위의 캐시 구성으로 전환 |
| 사용자 지정 지침으로 기본 구성을 교체하는 경로 | 기본 조립 경계가 없을 수 있으므로 별도 분기 |
| 캐싱을 끈 경로 | 입력은 구성하지만 API 캐시 마커는 생략 |

- 위 표는 분석한 구현의 분기를 일반화한 것이다. 제공사 내부용 확장을 공개 API의 범용 옵션으로 제시하지 않는다.
- Anthropic 캐시의 prefix는 **`tools` → `system` → `messages` 순서**로 구성된다. 앞선 JSON 예시의 키를 위아래로 옮기는 것으로 이 순서를 바꾸지는 못한다.
- **블록에 자체 마커가 없어도 뒤의 마커가 그 블록까지 포함한 prefix를 대상으로 삼을 수 있다.**
- 도구 정의와 시스템 지침을 바꾸면 뒤에 있는 대화의 캐시까지 영향을 줄 수 있다. [캐시 계층과 도구 변경](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-use-with-prompt-caching)

## cache_control은 무엇을 지정하는가

`cache_control`은 답변 자체를 저장하는 응답 캐시가 아니라, **해당 위치까지의 입력 prefix를 재사용하기 위한 옵션**이다.

```json
{
  "type": "text",
  "text": "여러 요청에서 같은 내용으로 사용하는 지침",
  "cache_control": {
    "type": "ephemeral",
    "ttl": "1h"
  }
}
```

| 필드 | 값 | 의미 |
| --- | --- | --- |
| 콘텐츠의 `type` | `text` | 본문의 콘텐츠 종류 |
| `cache_control.type` | `ephemeral` | 공개 SDK 타입에서 제공하는 임시 캐시 종류 |
| `cache_control.ttl` | `5m` 또는 `1h` | 캐시 유지 시간. 생략하면 기본 5분 |

- `static`, `dynamic`, `persistent`를 캐시 type으로 고르는 구조가 아니다.
- 요청 최상위에 두는 자동 캐싱과 개별 콘텐츠 블록에 두는 명시적 경계 방식이 있다.
- 캐시 범위·기능 지원·최소 길이 등의 조건도 충족해야 한다. 마커만으로 적중을 보장하지 않는다.
- 이 글의 예시는 공개 SDK가 정의한 기본 형태를 사용한다. [공식 캐시 타입](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/cache_control_ephemeral_param.py)

## system 필드와 system 메시지는 같은가

**시스템 지침의 개념은 공통이지만, 제공사의 요청 계약은 다르다.**

| 계층 / API | 초기 시스템 지침을 표현하는 방법 |
| --- | --- |
| Anthropic Messages | 최상위 `system` |
| Google Gemini | 별도 `systemInstruction`; Python SDK에서는 `system_instruction` |
| OpenAI Chat Completions | `messages`의 `system` 또는 `developer` 역할 |
| OpenAI Responses | 최상위 `instructions` 또는 호환되는 시스템·개발자 입력 메시지 |
| LangChain | 모델 호출 전에 `SystemMessage` 등 공통 메시지 객체로 표현 |
| Deep Agents | `system_prompt`로 받아 추가 지침과 조립한 뒤 모델 계층에 전달 |

공식 형식: [Gemini 요청](https://ai.google.dev/api/generate-content) · [OpenAI 메시지 역할](https://developers.openai.com/api/docs/guides/prompt-engineering) · [Responses 매핑](https://developers.openai.com/api/docs/guides/migrate-to-responses)

**LangChain의 메시지 목록이 그대로 HTTP payload가 되는 것은 아니다.**

```python
from langchain.messages import SystemMessage, HumanMessage

# model은 제공사별로 미리 구성한 LangChain 채팅 모델이다.
messages = [
    SystemMessage(content="너는 코드 리뷰어다."),
    HumanMessage(content="이 코드를 검토해줘."),
]
response = model.invoke(messages)
```

- Anthropic 어댑터는 앞의 시스템 지침을 분리해 최상위 `system`에 넣는다.
- OpenAI·Gemini 어댑터는 각각 선택한 API가 요구하는 형식으로 변환한다.
- 따라서 캐시를 확인할 때는 프레임워크의 메시지 객체와 실제 전송 payload를 구분한다. [LangChain 메시지](https://docs.langchain.com/oss/python/langchain/messages) · [Anthropic 어댑터 구현](https://github.com/langchain-ai/langchain/blob/master/libs/partners/anthropic/langchain_anthropic/chat_models.py)

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    model=model,
    system_prompt="너는 코드 리뷰어다.",
)

result = agent.invoke({
    "messages": [{"role": "user", "content": "이 코드를 검토해줘."}]
})
```

- Deep Agents는 설정된 프로필·미들웨어의 지침을 조립하고 LangChain 에이전트에 전달한다.
- 최종 필드 위치는 선택한 모델 어댑터가 결정한다.
- 캐시 마커를 붙이는 미들웨어와 프롬프트 조립 자체도 별도 책임이다. [Deep Agents 설정](https://docs.langchain.com/oss/python/deepagents/customization) · [조립 구현](https://github.com/langchain-ai/deepagents/blob/main/libs/deepagents/deepagents/graph.py)

최신 Anthropic API의 일부 모델은 대화 중간의 `role: "system"`도 지원한다. **초기 시스템 지침과 나중에 추가한 시스템 지침은 적용 위치·시점이 다르다.** 이 글의 초기 조립 구조를 모든 모델의 메시지 역할 제약으로 일반화해서는 안 된다. [대화 중 시스템 지침](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages)

## 위치만 잘 조절하면 캐시와 성능이 같은가

**어댑터를 거친 최종 입력이 같다면 표현 방식 때문에 차이가 생기지는 않는다. 그러나 같은 문장을 다른 필드로 옮기는 것까지 동등하다고 보장할 수는 없다.**

| 변경 | 캐싱·동작에 대한 판단 |
| --- | --- |
| 공통 메시지 객체를 제공사 필드로 정상 변환 | 같은 최종 입력과 설정이면 프레임워크의 표현 차이는 사라짐 |
| payload에서 지침을 다른 역할·시점으로 이동 | 토큰 순서·역할 경계·적용 시점이 달라질 수 있음 |
| JSON 객체의 필드 표시 순서만 변경 | 텍스트 편집기의 키 순서가 모델 프롬프트 순서를 정하지는 않음 |
| 앞쪽 시스템 지침을 매 턴 수정 | 변경 지점 뒤의 캐시 재사용에 영향을 줄 수 있음 |
| 기존 이력을 유지하며 새 문맥을 뒤에 추가 | 공통 prefix를 유지하는 데 유리 |
| 제공사·모델·도구·출력 설정까지 변경 | 캐시 및 동작 조건을 다시 확인해야 함 |

- 속도·비용: **재사용된 입력 토큰의 양**, 새로 처리한 입력, 첫 토큰까지의 지연을 확인한다.
- 답변 품질: 캐싱 자체와 지침의 역할·순서 변경은 다른 문제다. 캐시를 사용해도 답변은 새로 생성된다.
- 비교 방법: 같은 모델·설정·지침을 유지하고 최종 요청과 사용량을 함께 비교한다.
- 관측값: Anthropic의 캐시 읽기·생성 입력 토큰, OpenAI의 입력 토큰 상세 내 캐시 토큰, 실제 응답 지연을 확인한다. [OpenAI 캐시 관측](https://developers.openai.com/api/docs/guides/prompt-caching)

다음 지침 파일을 리뷰할 때는 문장 내용에 앞서 네 가지를 확인하면 된다.

1. **어느 필드와 역할에 들어가는가?** 시스템 지침, 사용자 문맥, 도구 설명을 구분한다.
2. **언제 다시 읽거나 조립하는가?** 로컬 캐시의 초기화·무효화 시점을 확인한다.
3. **요청의 어느 부분을 바꾸는가?** 앞부분 수정과 뒤쪽 추가를 구분한다.
4. **최종 payload와 캐시 사용량이 예상과 일치하는가?** 지침의 의미와 캐시 효과를 각각 검증한다.

## 다이어그램과 참고 자료

- [프롬프트 조립 구조도](/diagrams/claude-prompt-assembly-cache/prompt-assembly.html)
- [실행 토폴로지](/diagrams/claude-prompt-assembly-cache/runtime-topology.html)
- 인터랙티브 뷰어는 [Archify](https://github.com/tt-a1i/archify)로 생성했다. 본문 SVG는 같은 연결 구조를 블로그의 글꼴·확대 기능에 맞춰 표시한 버전이다. 독립 뷰어의 고정 메뉴는 영어다.
- [Anthropic 프롬프트 캐시](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic 도구 사용과 캐시](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-use-with-prompt-caching)
- [Anthropic 대화 중 시스템 메시지](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages)
- [OpenAI 프롬프트 캐시](https://developers.openai.com/api/docs/guides/prompt-caching)
- [LangChain 메시지](https://docs.langchain.com/oss/python/langchain/messages)
- [Deep Agents 커스터마이징](https://docs.langchain.com/oss/python/deepagents/customization)
