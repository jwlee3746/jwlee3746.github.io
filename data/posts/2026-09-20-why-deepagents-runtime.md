---
title: 'Deep Agents 활용: 도구·스킬·상태·스트리밍'
excerpt: Deep Agents의 강점을 도구 구성, 스킬 로딩, 실행 상태와 스트리밍으로 나누고, 서버형 에이전트에 연결한 방식을 간결하게 정리합니다.
date: '2026-09-20'
category: Agent
tags:
  - Deep Agents
  - LangChain
  - LangGraph
  - Agent Runtime
  - State Management
permalink: /posts/why-deepagents-runtime/
toc: true
---

**Deep Agents는 도구 사용과 스킬 기반 문맥 구성을 하나의 에이전트 실행 흐름으로 묶는 데 강점이 있다.** LangChain의 모델·도구 인터페이스와 LangGraph의 상태 관리 기반을 함께 활용할 수 있다. [공식 개요](https://docs.langchain.com/oss/javascript/deepagents/overview)

## 강점과 실제 활용

2026년 4월 서버형 에이전트 구현에서 사용한 범위다.

| 강점 | 어떻게 썼나 |
| --- | --- |
| **모델·도구 구성** | 모델 객체와 레지스트리의 도구 스키마를 `createDeepAgent`에 연결했다. |
| **스킬 기반 문맥** | 기능별 지침을 스킬 파일로 분리하고, `/skills` 경로와 `files` 입력으로 런타임에 제공했다. |
| **실행 상태 관리** | LangGraph의 `MemorySaver`를 연결하고 `thread_id`로 실행 상태를 구분했다. |
| **스트리밍** | 모델 출력을 Adapter에서 서비스 이벤트로 변환해 HTTP SSE로 전달했다. |

- 스킬은 필요한 지침을 찾아 읽는 구조에 적합하다. 모든 기능의 상세 설명을 하나의 프롬프트로 관리하는 부담을 줄일 수 있다. [Skills](https://docs.langchain.com/oss/javascript/deepagents/skills)
- 상태 관리와 스트리밍은 기반 라이브러리의 기능을 함께 사용하는 것이다. Deep Agents에서는 이를 스킬·도구 구성과 조합했다.

![서비스 Adapter와 Deep Agents, LangChain, LangGraph의 역할을 구분한 구성도](/data/images/posts/why-deepagents-runtime/framework-layers.svg)

그림 1. 라이브러리별 역할. 서비스는 요청·응답 계약을 유지하고, 런타임에 모델·도구·스킬을 연결한다.

## 이렇게 연결했다

**설정은 모델·도구·스킬·체크포인터를 조합하고, 실행할 때 메시지와 스킬 파일을 전달하는 형태다.** 아래는 당시 구현을 축약한 예시이며, 모델 생성과 정의 파일 로딩은 생략했다.

```typescript
const agent = createDeepAgent({
  model,
  systemPrompt,
  tools: registeredTools.map(tool),
  skills: ["/skills"],
  checkpointer: new MemorySaver(),
});

const stream = await agent.stream(
  { messages, files: skillFiles },
  {
    streamMode: "messages",
    configurable: { thread_id: requestId },
  },
);
```

- **도구:** 이름·설명·입력 스키마를 등록해 모델이 사용할 수 있게 했다.
- **스킬:** 레지스트리에서 읽은 기능별 지침을 파일 형태로 실행 문맥에 넣었다.
- **Adapter:** 도메인 메시지를 런타임 메시지로 바꾸고, 출력을 텍스트·도구 호출·완료 정보로 변환했다.

![요청을 Adapter가 변환하고 Deep Agents의 모델 출력과 실행 상태를 서비스 응답으로 연결하는 시퀀스](/data/images/posts/why-deepagents-runtime/request-sequence.svg)

그림 2. 요청 처리 흐름. 체크포인트 저장 시점과 중간 이벤트는 단순화했다.

## 서비스에 남긴 책임

**실행 기반은 활용하되, 외부 도구 실행과 대화 연결 정책은 서비스에서 관리했다.**

- 당시 `thread_id`는 요청 ID였으므로 대화 전체를 이어가는 정책은 별도로 필요했다.
- `MemorySaver`는 메모리 저장소다. 프로세스 재시작 후 상태를 복구하려면 영속 체크포인터가 필요하다. [Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- 사용자 확인, 외부 도구 결과 대응, 서비스의 완료 판단은 도메인 계약으로 남겼다.

구현 근거: 원본 프로젝트의 `7cdab641`에 있는 `cognitive-supervisor-agent.ts`, `cognitive-supervisor-agent-adapter.ts`, `skills.ts`. 예시는 해당 시점의 API를 기준으로 한다.
