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

| 강점 | 어떻게 썼나 |
| --- | --- |
| **모델·도구 구성** | 모델 객체와 레지스트리의 도구 스키마를 `createDeepAgent`에 연결했다. |
| **스킬 기반 문맥** | 기능별 지침을 스킬 문서로 분리해 런타임에 제공했다. |
| **실행 상태 관리** | LangGraph의 `MemorySaver`를 연결하고 `thread_id`로 실행 상태를 구분했다. |
| **스트리밍** | 모델 출력을 연결 계층에서 서비스 이벤트로 변환해 HTTP SSE로 전달했다. |

- 스킬은 필요한 지침을 찾아 읽는 구조에 적합하다. 모든 기능의 상세 설명을 하나의 프롬프트로 관리하는 부담을 줄일 수 있다. [Skills](https://docs.langchain.com/oss/javascript/deepagents/skills)
- 상태 관리와 스트리밍은 기반 라이브러리의 기능을 함께 사용하는 것이다. Deep Agents에서는 이를 스킬·도구 구성과 조합했다.

![애플리케이션과 Deep Agents, LangChain, LangGraph의 역할을 구분한 구성도](/data/images/posts/why-deepagents-runtime/framework-layers.svg)

그림 1. 라이브러리별 역할. 애플리케이션은 대화를 연결하고 실행 결과를 전달하며, 런타임에 모델·도구·스킬을 연결한다.

## 이렇게 연결했다

**설정은 모델·도구·스킬·체크포인터를 조합하고, 실행할 때 메시지와 스킬 파일을 전달하는 형태다.**

- **도구:** 이름·설명·입력 스키마를 등록해 모델이 사용할 수 있게 했다.
- **스킬:** 레지스트리에서 읽은 기능별 지침을 파일 형태로 실행 문맥에 넣었다.
- **연결 계층:** 도메인 메시지를 런타임 메시지로 바꾸고, 출력을 텍스트·도구 호출·완료 정보로 변환했다.

![날씨 질문이 도구 호출 요청과 ToolMessage를 거쳐 최종 답변으로 이어지는 예시](/data/images/posts/why-deepagents-runtime/request-sequence.svg)

그림 2. 외부 도구를 애플리케이션이 실행하는 구성 예시. 도구 이름·호출 ID·날씨 값은 설명용으로 새로 만들었다. 메시지는 주요 필드만 표시하고 모델 호출·상태 저장·중간 스트리밍은 단순화했다.

- **사용자 질문:** `HumanMessage.content`에 “서울 날씨 알려줘”를 담는다.
- **호출 요청:** 모델은 `AIMessage.tool_calls`에 사용할 도구와 입력값을 담는다.
- **실행 결과:** `ToolMessage.content`에 도구 실행 결과를 담고, `tool_call_id`를 호출 요청의 `id`와 맞춘다. [메시지 공식 문서](https://docs.langchain.com/oss/javascript/langchain/messages#tool-message)
- **최종 답변:** 모델이 결과를 읽고 `AIMessage.content`에 “서울은 맑고 22°C예요.”를 담는다.

## 애플리케이션에서 직접 처리한 부분

**Deep Agents를 연결해도 대화를 어떻게 이어가고, 도구를 언제 실행할지는 애플리케이션에서 정해야 한다.**

- **대화 이어가기:** “서울 날씨 알려줘” 다음에 “내일은?”이라고 물으면 같은 대화로 연결한다. 요청마다 다른 `thread_id`를 쓰면 앞선 대화를 자동으로 이어 주지 못한다.
- **상태 보관:** `MemorySaver`의 내용은 서버가 재시작되면 사라진다. 재시작 후에도 대화를 복원하려면 영속 체크포인터를 연결한다. [Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- **도구 실행 처리:** 호출 요청을 받으면 실행 허용 여부를 확인하고, 실제 결과를 모델에 전달한다. 예를 들어 일정 삭제처럼 확인이 필요한 작업은 사용자 동의를 받은 뒤 실행하도록 정한다.
