---
title: '[리서치] OpenClaw 아키텍처: Gateway에서 Tool·Skill·Plugin까지'
excerpt: 블록·시퀀스 다이어그램으로 OpenClaw의 실행 구조를 읽고, 코드 예시와 비교 표로 Tool·Skill·Plugin, Session과 Automation의 책임을 구분합니다.
date: '2026-09-01'
category: Agent
tags:
- OpenClaw
- Gateway
- Tool Calling
- Plugin
- Skill
permalink: /posts/openclaw-architecture-research/
legacyUrl: /blog/Agent/openclaw-architecture-research/
toc: true
---

**OpenClaw는 Gateway가 연결과 상태를 관리하고, agent loop가 model과 도구를 연결하는 실행 환경이다.** 아래에서는 같은 날씨 조회 예시를 구조도 → 실행 순서 → 확장 코드 순서로 따라간다.

> 2026년 9월 19일 공식 문서를 다시 확인해 재구성했다. 다이어그램은 책임과 호출 관계를 단순화한 개념도다. 코드에는 설정 조각·등록부 발췌·의사코드 여부를 표시했으며, 완성된 Plugin 설치 예제는 아니다.

## 먼저 결론: OpenClaw는 model이 아니라 runtime이다

[![CLI·UI와 채널이 Gateway에 연결되고 Session, Agent loop, Scheduler가 문맥·도구·모델을 연결하는 블록 다이어그램](/data/images/posts/openclaw-architecture-research/openclaw-runtime-map.svg)](/data/images/posts/openclaw-architecture-research/openclaw-runtime-map.svg)

그림 1. Gateway 내부의 실행 책임과 외부 연결. 이미지를 선택하면 원본 크기로 볼 수 있다.

| 경계 | 받는 것 → 내보내는 것 | 맡는 책임 |
| --- | --- | --- |
| Gateway | 요청 → run 접수·이벤트 | 연결, 인증, routing |
| Session / Queue | session key → history·실행 순서 | 대화 연속성, 같은 session의 동시 실행 조정 |
| Agent loop | context → 응답·도구 호출 | model과 도구 사이의 반복 실행 |
| Context / Capability | 파일·등록 코드 → 지침·도구 | Workspace, Skill, Tool, Hook |
| Model provider | prompt·도구 결과 → 추론 결과 | 다음 행동 또는 응답 생성 |
| Scheduler | 예약 상태 → 실행 요청 | 실행 시점과 결과 전달 관리 |

Model을 바꾸는 것과 runtime을 바꾸는 것은 영향 범위가 다르다. 후자는 문맥 구성, 실행 순서, 도구 연결과 상태 관리까지 바꾼다. [Gateway architecture](https://docs.openclaw.ai/concepts/architecture) · [Agent runtime](https://docs.openclaw.ai/concepts/agent)

## Gateway: 장시간 살아 있는 control plane

CLI·UI·node는 Gateway의 WebSocket API에 연결한다. 메시징 채널은 채널별 연동을 거친다. **연결 수립, 요청 접수, 실행 완료를 구분해서 읽는 것**이 핵심이다.

| 단계 | 메시지 / 상태 | 해석 |
| --- | --- | --- |
| 연결 | `connect` → 연결 승인 | 인증·역할 확인 후 API 사용 |
| 요청 | `type: "req"`, `id`, `method`, `params` | `id`로 요청과 응답을 대응 |
| 응답 | `type: "res"`, `ok`, `payload` 또는 `error` | 호출 결과 또는 접수 상태 |
| 이벤트 | `type: "event"`, `event`, `payload` | 실행 진행 상황을 비동기로 전달 |
| 완료 확인 | `runId`와 lifecycle / `agent.wait` | 접수된 run이 끝났는지 추적 |

**프로토콜 예시 — 인증된 연결에서 보내는 `health` 요청과 요청 ID 대응.** 연결 handshake와 오류 응답은 생략했다.

```json
{
  "type": "req",
  "id": "health-01",
  "method": "health",
  "params": {}
}
```

```text
Client  ── req: health-01 ──▶  Gateway
Client  ◀─ res: health-01 ───  Gateway

agent 요청의 접수 확인 ≠ agent run의 실행 완료
```

필드 구조는 [Gateway architecture](https://docs.openclaw.ai/concepts/architecture), run 접수와 대기는 [Agent loop](https://docs.openclaw.ai/concepts/agent-loop)를 기준으로 했다.

## Agent loop: 한 turn이 action과 reply가 되는 과정

예시 요청은 “서울 날씨를 알려줘”다. model이 날씨 도구를 선택하면 runtime이 실행하고, model은 도구 결과를 받아 답을 만든다. 도구가 필요 없는 요청은 도구 호출 구간을 건너뛴다.

[![Gateway, Agent loop, Model, Tool 사이의 추론·도구 호출·결과 반영·응답 전달 시퀀스 다이어그램](/data/images/posts/openclaw-architecture-research/agent-tool-sequence.svg)](/data/images/posts/openclaw-architecture-research/agent-tool-sequence.svg)

그림 2. 한 번의 도구 호출을 펼친 실행 순서. 도구 호출과 재추론은 여러 번 반복될 수 있다. Streaming과 transcript 갱신은 실행 중에도 일어난다.

**실행 책임을 설명하는 의사코드.** 아래 함수명은 설명용이며 OpenClaw SDK API가 아니다. 취소·timeout·재시도 처리는 생략했다.

```python
with session_lane(session_key):
    context = assemble_context(history, workspace, skills)

    while True:
        step = model.infer(context, allowed_tools)
        if not step.tool_calls:
            break

        for call in step.tool_calls:
            result = execute_with_hooks(call)
            context.append(result)
            persist_tool_result(result)

    persist_assistant_reply(step.reply)
    deliver(step.reply)
```

| 관찰 지점 | 확인할 것 | 놓치면 생기는 문제 |
| --- | --- | --- |
| Context 구성 | 어떤 history·Skill·도구가 들어갔는가 | model 오류와 입력 구성 오류를 혼동 |
| Session lane | 같은 session의 run이 어떤 순서로 실행되는가 | 결과·history 순서 충돌 |
| Tool 전후 | 인자, 결과, 실패 상태 | 추론과 외부 실행 실패를 구분하기 어려움 |
| Streaming / 저장 | 진행 이벤트와 기록된 실행 결과 | 화면에 나온 텍스트만으로 완료를 오판 |

실제 runtime은 session별 queue, 실행 제한과 이벤트 전달을 함께 다룬다. `agent.wait`의 대기 timeout은 run 취소와 다르다. [Agent loop](https://docs.openclaw.ai/concepts/agent-loop)

## Tool, Skill, Plugin을 구분하는 기준

[![Skill은 Agent loop에 지침을 제공하고 Plugin이 등록한 Tool과 Hook이 외부 API 실행을 담당하는 블록 다이어그램](/data/images/posts/openclaw-architecture-research/capability-boundaries.svg)](/data/images/posts/openclaw-architecture-research/capability-boundaries.svg)

그림 3. 같은 날씨 조회 기능에서도 판단 절차, 실제 호출, 등록과 배포는 서로 다른 책임이다.

| 구성요소 | 날씨 조회에서 맡는 역할 | 넣지 않을 책임 |
| --- | --- | --- |
| Skill | 지역이 없으면 확인하고 조회 결과를 요약 | API 인증·입력 검증의 강제 |
| Tool | 지역을 입력받아 외부 기능 실행 | 긴 업무 절차 전체 |
| Plugin | Tool·Hook 등록과 설정·배포 | model의 모든 판단을 대체 |
| Hook | 호출 전 공통 제약, 호출 후 관측 | 반드시 보존되어야 하는 작업 큐 |

선택은 “기존 기능의 사용법인가, 새 행동인가, runtime에 등록할 코드인가?”로 나눈다. [Capabilities overview](https://docs.openclaw.ai/tools) · [Building plugins](https://docs.openclaw.ai/plugins/building-plugins)

### Workspace와 Skill: 실행 코드가 아니라 판단의 문맥

**Skill 파일 예시** — `<workspace>/skills/weather-summary/SKILL.md`. 아래의 `weather_lookup` 도구가 별도로 등록되어 있다고 가정한다.

```markdown
---
name: weather-summary
description: 사용자가 요청한 지역의 현재 날씨를 조회하고 요약한다.
---

1. 지역이 명확하지 않으면 사용자에게 확인한다.
2. weather_lookup에 확인한 지역을 전달한다.
3. 조회 결과의 관측 시각과 기온을 함께 설명한다.
4. 조회가 실패하면 현재 날씨를 추정해서 쓰지 않는다.
```

Skill은 실행 코드를 추가하지 않는다. 같은 이름의 Skill이 여러 위치에 있으면 loading precedence가 적용되므로, 수정한 파일이 실제 선택된 위치인지도 확인해야 한다. [Skills](https://docs.openclaw.ai/tools/skills)

### Tool: model과 실행 코드 사이의 계약을 만든다

**Plugin `register(api)` 내부의 등록부 발췌.** `Type`은 `typebox`의 import, `lookupWeather`는 별도로 구현할 날씨 서비스 adapter다. adapter는 아래 네 필드만 반환하도록 가정한다.

```typescript
api.registerTool({
  name: "weather_lookup",
  description: "지정한 지역의 현재 날씨를 조회한다.",
  parameters: Type.Object({
    city: Type.String({ minLength: 1 }),
  }),
  async execute(_id, { city }) {
    const weather = await lookupWeather(city);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(weather),
      }],
    };
  },
});
```

**도구 출력 예시 — 설명을 위한 가상 데이터다.** 외부 서비스의 원본 응답 전체 대신 답변에 필요한 필드를 반환한다.

```json
{
  "city": "서울",
  "temperatureC": 24,
  "condition": "흐림",
  "observedAt": "2026-09-19T09:00:00+09:00"
}
```

| 코드 밖에서 완성할 부분 | 이유 |
| --- | --- |
| Plugin entry와 package metadata | runtime이 Plugin을 로드하도록 연결 |
| Manifest의 `contracts.tools` 선언 | 등록한 `weather_lookup`의 소유권·탐색 정보 명시 |
| Adapter의 인증·timeout·오류 처리 | 외부 서비스 실행 책임을 완성 |
| 도구 노출 정책 | model이 사용할 수 있는 범위를 결정 |

등록 API와 manifest 요구사항은 [Building plugins](https://docs.openclaw.ai/plugins/building-plugins)를 따른다. 위 조각만 복사해도 설치되는 예제는 아니다.

### Plugin과 Hook: core를 수정하지 않고 runtime에 개입한다

**Plugin 등록부 발췌** — 빈 지역으로 날씨 도구가 실행되는 것을 막는 예다. Tool schema와 실행 코드의 검증을 대체하지 않는다.

```typescript
api.on("before_tool_call", (event) => {
  if (event.toolName !== "weather_lookup") return;

  const city = event.params.city;
  if (typeof city !== "string" || !city.trim()) {
    return {
      block: true,
      blockReason: "조회할 지역이 필요합니다.",
    };
  }
});
```

| 목적 | Plugin Hook | 주의할 경계 |
| --- | --- | --- |
| Prompt 구성 조정 | `before_prompt_build` | 모델 입력을 바꾸는 지점 |
| 도구 실행 전 제약 | `before_tool_call` | 차단·인자 조정 |
| 도구 실행 후 관측 | `after_tool_call` | 로그·실행 결과 관측 |
| Transcript 저장 전 변환 | `tool_result_persist` | 지원 runtime의 저장 경계 |

Typed Plugin Hook은 `api.on(...)`으로 등록한다. `HOOK.md` 기반 내부 hook이나 외부 HTTP webhook과는 다른 기능이다. [Plugin hooks](https://docs.openclaw.ai/plugins/hooks) · [Tool call policy hooks](https://docs.openclaw.ai/plugins/hooks/tool-policy)

## Session: 대화 history 이상의 routing boundary

같은 사용자의 후속 질문은 이어져야 하고, 다른 사용자의 대화는 분리되어야 한다. Session key는 **어느 문맥과 실행 순서를 공유할지** 정하는 기준이다.

**설정 조각 — DM을 channel과 sender 조합으로 분리한다.** 기존 OpenClaw 설정의 `session` 항목에 병합하는 예다.

```json
{
  "session": {
    "dmScope": "per-channel-peer"
  }
}
```

| `dmScope` | DM 문맥을 나누는 기준 | 검토할 상황 |
| --- | --- | --- |
| `main` | 같은 agent의 main session 공유 | 기본 단일 사용자 구성 |
| `per-peer` | 발신자 | channel을 넘어 같은 사람의 문맥을 이을 때 |
| `per-channel-peer` | channel + 발신자 | channel별 대화까지 분리할 때 |
| `per-account-channel-peer` | account + channel + 발신자 | 여러 계정을 운영할 때 |

이는 DM routing 설정이며 모든 channel·thread의 예외를 없애는 설정은 아니다. Session 분리와 외부 API의 사용자별 권한 검증도 별도로 설계해야 한다. [Session management](https://docs.openclaw.ai/concepts/session)

## Automation: “나중에 실행”도 Gateway의 책임이다

“내일 아침 서울에 비가 오면 알려줘”는 **시점에 맞춰 깨우기**와 **그때 날씨를 조회해 판단하기**로 나뉜다.

[![Scheduler가 예약 상태를 보존하고 Agent run을 깨운 뒤 실행 결과와 전달 결과를 따로 확인하는 시퀀스 다이어그램](/data/images/posts/openclaw-architecture-research/automation-sequence.svg)](/data/images/posts/openclaw-architecture-research/automation-sequence.svg)

그림 4. 예약 실행의 책임 순서. 실제 session 선택과 전달 방식은 job 설정에 따라 달라진다.

| 상태 | 보존할 정보 | 실패를 구분할 질문 |
| --- | --- | --- |
| Scheduler state | 예약 시점, 대상, 실행 이력 | 예정된 작업이 시작됐는가? |
| Agent / Session state | 문맥, 도구 결과, 판단 | 조회와 조건 판단에 성공했는가? |
| Delivery state | 전달 경로와 결과 | 응답이 목적지에 도착했는가? |

Prompt에 미래 시각을 적는 것만으로 예약이 생기지는 않는다. Scheduler가 작업을 보존하고 실행을 요청해야 한다. 작업 성공과 알림 전달 성공도 따로 관측해야 한다. [Automations](https://docs.openclaw.ai/automation/cron-jobs)

## 보안은 sandbox 하나로 끝나지 않는다

| 제어 | 답하는 질문 | 다른 제어와의 관계 |
| --- | --- | --- |
| Tool policy | 어떤 도구를 노출·호출할 수 있는가? | 이름 기준의 허용·차단 |
| Sandbox | 도구가 어느 실행 환경에서 동작하는가? | 호출 가능한 도구의 실행 범위 제한 |
| Elevated | sandbox의 `exec`를 host에서 실행할 수 있는가? | 도구 deny를 우회하지 않음 |
| Skill 지침 | model이 어떤 순서와 기준을 따를 것인가? | 강제 권한 제어를 대체하지 않음 |

**설정 조각 — `exec`와 `process`를 도구 정책에서 차단한다.** 다른 Tool이나 Plugin까지 읽기 전용으로 만드는 설정은 아니다.

```json
{
  "tools": {
    "deny": ["exec", "process"]
  }
}
```

`deny`가 `allow`보다 우선한다. 반대로 `exec`를 허용한 채 파일 쓰기 도구만 차단하면 shell을 통한 쓰기까지 막히지는 않는다. [Sandbox vs tool policy vs elevated](https://docs.openclaw.ai/gateway/sandbox-vs-tool-policy-vs-elevated)

## 아키텍처를 읽고 남는 판단 기준

| 바꾸려는 것 | 먼저 볼 위치 |
| --- | --- |
| 기능 선택·사용 절차 | Workspace / Skill |
| 실행할 외부 행동·입출력 | Tool / Adapter |
| 기능 등록·설정·배포 | Plugin |
| 실행 전후 공통 개입 | Hook |
| 대화 연속성·동시성 | Session / Queue |
| 예약·재실행·결과 전달 | Automation |
| 연결·인증·이벤트 진입점 | Gateway |

다음 글에서는 이 경계를 실제 PoC에 적용한 판단과 한계를 정리한다. [OpenClaw 컴포넌트 적용기 읽기](/posts/openclaw-component-application/)

## 참고 자료

- [OpenClaw 공식 저장소](https://github.com/openclaw/openclaw)
- [Gateway architecture](https://docs.openclaw.ai/concepts/architecture)
- [Agent runtime](https://docs.openclaw.ai/concepts/agent)
- [Agent loop](https://docs.openclaw.ai/concepts/agent-loop)
- [Capabilities overview](https://docs.openclaw.ai/tools)
- [Skills](https://docs.openclaw.ai/tools/skills)
- [Building plugins](https://docs.openclaw.ai/plugins/building-plugins)
- [Plugin hooks](https://docs.openclaw.ai/plugins/hooks)
- [Session management](https://docs.openclaw.ai/concepts/session)
- [Automations](https://docs.openclaw.ai/automation/cron-jobs)
- [Sandbox vs tool policy vs elevated](https://docs.openclaw.ai/gateway/sandbox-vs-tool-policy-vs-elevated)
