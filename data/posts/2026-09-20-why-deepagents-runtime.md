---
title: '왜 Deep Agents를 선택했나: 실행 루프와 상태 관리의 경계'
excerpt: 직접 작성한 계획·도구 실행 루프를 Deep Agents로 옮기며 무엇을 맡기고 무엇을 서비스에 남겼는지, LangChain·LangGraph의 역할과 실제 도입 코드를 바탕으로 살펴봅니다.
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

**Deep Agents를 선택한 가장 큰 이유는 실행 루프와 상태 관리를 계속 직접 구현해야 하는 부담이었다.** 모델의 다음 행동을 결정하는 코드뿐 아니라, 도구 결과를 반영하고 실행 이력을 유지하며 응답을 서비스 형식으로 돌려주는 코드까지 함께 늘어나고 있었다.

- 이 글은 서버형 에이전트 프로젝트가 자체 실행 코드에서 Deep Agents로 전환한 **Phase 2**를 다룬다. 핵심 범위는 2026년 4월 10~20일이다.
- **선택 동기**는 당시 개발 맥락에 대한 회고, **실제 변화**는 해당 시점의 코드, **기술적 역할**은 공식 문서를 근거로 구분한다.
- 공식 문서는 2026년 9월 20일 확인했다. 현재 문서의 모든 기능이 도입 당시 활성화되어 있었다고 가정하지 않는다.
- 도입 커밋의 lockfile은 TypeScript 패키지 `deepagents 1.9.0`, `langchain 1.3.1`, `@langchain/langgraph 1.2.8`을 기록한다. 아래 역사적 코드 예시는 최신 API 사용법을 안내하는 예제가 아니다.

## 직접 구현의 부담은 어디에서 생겼나

**초기 구조에는 작업을 나누는 루프와 도구를 실행하는 루프가 따로 있었다.**

![자체 Orchestrator와 SubtaskRunner의 중첩 루프를 Adapter와 Deep Agents 런타임으로 교체한 전후 구조](/data/images/posts/why-deepagents-runtime/ownership-boundary.svg)

그림 1. 계획·실행 코드의 책임 이동. 오른쪽은 Phase 2의 구조이며, 이후에 추가된 Fast/Deep 계층이나 PCS 캐시는 포함하지 않는다.

| 직접 관리하던 책임 | 초기 코드의 동작 | 기능이 늘면 함께 고려할 문제 |
| --- | --- | --- |
| 상위 작업 선택 | `SubtaskPlanner`가 `subtask` 또는 `complete` 반환 | 이전 작업 결과를 다음 계획에 어떻게 반영할 것인가 |
| 도구 선택·실행 | `SubtaskRunner`가 `ToolPlanner → ToolRunner` 반복 | 반복 한도, 실행 실패, 다음 행동의 판단 기준 |
| 실행 문맥 유지 | `memory`, `observation`, `histories` 전달 | 어떤 결과를 남기고 다음 단계에 전달할 것인가 |
| 모델 응답 해석 | 계획별 스키마와 결과 형식 관리 | 모델 출력과 애플리케이션 상태를 어떻게 맞출 것인가 |
| 서비스 연결 | 모델별 클라이언트와 응답 처리 코드 | 스트리밍·메시지 변환·도구 결과 형식을 어떻게 일관되게 유지할 것인가 |

- 초기 구현에도 스키마 검증, 반복 한도, 오류 처리가 있었다. 아무런 실행 제어가 없었던 것은 아니다.
- 부담은 **공통 실행 메커니즘을 유지하면서 서비스 기능도 동시에 확장해야 한다는 점**이었다.
- 아래는 초기 코드의 두 반복문을 간추린 의사코드다. 실제 예외 처리와 결과 형식은 생략했다.

```typescript
for (const step of subtaskBudget) {
  const plan = await subtaskPlanner.plan(utterance, histories);
  if (plan.action === "complete") break;

  for (const step of toolBudget) {
    const action = await toolPlanner.plan(plan, memory, observation);
    if (action.action === "complete") break;

    observation = await toolRunner.run(action.tool);
    memory = action.memory;
  }

  histories.push(summarizeSubtask());
}
```

## LangChain, LangGraph, Deep Agents는 각각 무엇을 맡나

**세 라이브러리는 같은 추상화 수준의 대안이 아니다.** 이 프로젝트는 Deep Agents를 실행 입구로 사용하면서 LangChain의 모델·메시지·도구와 LangGraph의 체크포인터를 함께 연결했다.

![서비스와 Adapter 아래에 Deep Agents, LangChain, LangGraph가 맡는 역할을 층별로 구분한 다이어그램](/data/images/posts/why-deepagents-runtime/framework-layers.svg)

그림 2. 개념적 계층. 별도 서버 세 개를 호출하는 배포 구성이 아니라, 하나의 애플리케이션에서 조합하는 라이브러리들의 관계다.

| 구성 요소 | 맡기는 책임 | 프로젝트에서 확인되는 사용 |
| --- | --- | --- |
| **LangChain** | 모델·메시지·도구 인터페이스와 에이전트 구성 요소 | 모델 객체, 메시지 변환, `tool()`과 스키마 연결 |
| **LangGraph** | 상태를 가진 실행 흐름과 체크포인트 기반 | `MemorySaver`, 실행 설정의 `thread_id` |
| **Deep Agents** | 에이전트 실행에 필요한 구성을 묶은 harness | `createDeepAgent`, 도구 목록, `/skills`와 파일 상태 연결 |
| **서비스 / Adapter** | 제품의 요청·응답 계약과 런타임 연결 | HTTP/SSE, 도메인 메시지, 완료 여부·도구 호출 변환 |

- LangChain은 모델·도구·미들웨어를 조합하는 기반을 제공한다. `createAgent`를 직접 사용하는 선택도 가능하다. [LangChain 개요](https://docs.langchain.com/oss/javascript/langchain/overview)
- LangGraph는 상태가 있는 실행 흐름을 구성하는 낮은 수준의 기반이다. Deep Agents를 사용한다고 애플리케이션이 반드시 `StateGraph`를 직접 작성해야 하는 것은 아니다. [LangGraph 개요](https://docs.langchain.com/oss/javascript/langgraph/overview)
- Deep Agents는 LangChain과 LangGraph 위에 구성된 harness다. Harness는 모델 주변의 도구, 문맥 처리, 실행 규칙을 묶어 실제 작업을 수행하게 하는 구성이다. [Deep Agents 개요](https://docs.langchain.com/oss/javascript/deepagents/overview)

## 왜 LangChain만 쓰거나 LangGraph를 직접 조립하지 않았나

**이번 선택에서는 공통 실행 기반을 직접 조립·유지하는 범위를 줄이는 것이 중요했다.** 다음 표는 당시 대안들을 모두 구현해 벤치마크했다는 기록이 아니라, 확인된 선택 동기를 책임 분담 관점에서 해석한 비교다.

| 선택 | 직접 설계할 범위 | 잘 맞는 조건 | 이 프로젝트에서의 판단 |
| --- | --- | --- | --- |
| 모델 SDK + 자체 루프 | 메시지 축적, 도구 실행 반복, 상태·중단·복구 계약 | 흐름이 작고 요구가 제한적이거나, 실행을 세밀하게 통제해야 할 때 | 이미 두 단계 계획 루프와 이력 전달을 직접 관리하고 있었음 |
| LangChain `createAgent` | 기본 루프 위의 서비스 정책과 필요한 문맥 관리 | 모델·도구 루프를 중심으로 필요한 기능만 조합할 때 | 유효한 대안이며, 이후 실제 Fast 계층에서 사용 |
| LangGraph 직접 구성 | 상태 스키마, 노드, 분기와 재개 흐름 | 고정 업무 흐름과 에이전트 판단을 명시적으로 섞어야 할 때 | 제어 범위는 넓지만 직접 설계해야 할 실행 구조도 남음 |
| Deep Agents | 제공된 구성을 선택하고 서비스와 연결하는 경계 | 도구·스킬·문맥 관리의 공통 구성을 함께 활용할 때 | 실행 기반을 받아들이고 도메인 연결에 집중하는 출발점으로 선택 |

- LangChain의 기본 에이전트도 모델과 도구를 반복 연결한다. **도구 호출이 필요하다는 사실만으로 Deep Agents가 필수인 것은 아니다.** [Agents](https://docs.langchain.com/oss/javascript/langchain/agents)
- Deep Agents의 추가 가치는 개별 기능보다 **함께 사용할 실행 구성이 준비되어 있다는 점**에 있다. 다만 기본 구성이 서비스 요구와 얼마나 맞는지는 따로 확인해야 한다. [Customization](https://docs.langchain.com/oss/javascript/deepagents/customization)
- 선택의 효과는 구현 책임의 이동으로 확인할 수 있다. 당시 비교 성능 자료를 확인하지 못했으므로 지연시간이나 성공률이 개선되었다고 단정하지 않는다.

## 도입은 작은 실행 경로에서 시작했다

**처음부터 모든 기능을 사용한 것은 아니다.** 4월 10일의 시작점은 모델, 기본 프롬프트, 빈 도구 목록을 연결한 실행 경로였다.

```typescript
// 도입 시점의 설정 형태를 간추린 예시. 모델 생성·설정 로드는 생략.
const agent = createDeepAgent({
  model,
  tools: [],
  systemPrompt: "You are a helpful assistant.",
});
```

| 시점 | 실제 추가한 것 | 의미 |
| --- | --- | --- |
| 4월 10일 | `AgentController`, `AgentAdapter`, Deep Agents 호출, HTTP/SSE | 서비스와 런타임을 연결하는 최소 경계 구성 |
| 4월 14일 | 도구 스키마, `MemorySaver`, 도구 호출이 포함된 완료 이벤트 | 텍스트 응답에서 도구 실행을 요구하는 응답으로 확장 |
| 4월 15일 | 도구·스킬·에이전트 레지스트리 | 정의 파일과 실행 코드를 분리해 구성 가능하게 만듦 |
| 4월 20일 | DI 부트스트랩 | 늘어난 구성 요소의 생성과 연결을 정리 |

- 첫 도입 테스트는 `invoke` 결과 변환과 스트리밍 청크 조립을 확인한다. 장시간 복구나 비용 개선을 입증하는 테스트는 아니다.
- 처음 연결한 모델 경로는 OpenRouter였다. 이후의 여러 공급자 지원을 도입 첫날부터 확보한 성과로 쓰지 않는다.

### 스킬은 프롬프트에 붙이는 문서에서 실행 문맥의 자원으로

- 4월 15일 구성은 `skills: ["/skills"]`를 지정하고, 레지스트리에서 읽은 내용을 런타임의 `files` 입력으로 전달했다.
- 서비스는 **정의 파일을 읽고 검증·등록하는 일**을 맡고, 런타임에는 스킬을 읽을 수 있는 실행 문맥을 제공했다.
- 파일 상태를 제공했다는 사실이 서버 디스크 접근이나 영속 파일 저장을 의미하지는 않는다.
- 현재 공식 스킬 모델은 목록·설명으로 후보를 찾고 필요할 때 본문을 읽는 점진적 로딩을 설명한다. 당시 코드에서는 스킬 경로와 파일 입력의 연결을 확인했으며, 실제 호출마다 어떤 스킬을 읽었는지는 실행 trace가 있어야 판단할 수 있다. [Skills](https://docs.langchain.com/oss/javascript/deepagents/skills)

## 상태 관리는 어디까지 맡길 수 있었나

**체크포인터를 연결하는 것과 서비스의 대화·업무 상태를 완성하는 것은 별도 작업이었다.**

![클라이언트 요청을 Adapter가 런타임 메시지로 변환하고, 모델 출력과 체크포인트를 거쳐 서비스 이벤트로 반환하는 시퀀스](/data/images/posts/why-deepagents-runtime/request-sequence.svg)

그림 3. 4월 중순 코드에서 확인되는 요청 경계의 개념도. 체크포인트 저장 시점은 단순화했으며, 외부 도구 실행이나 사용자 확인의 전체 재개 절차를 그린 것은 아니다.

| 상태의 종류 | 담당할 정보 | 도입 당시 확인한 범위 |
| --- | --- | --- |
| 런타임 실행 상태 | 메시지와 실행 단계의 체크포인트 | `MemorySaver` 연결 |
| 실행 식별자 | 어느 실행 상태를 참조할지 | `thread_id`에 `requestId` 또는 새 UUID 사용 |
| 서비스 대화 상태 | 사용자 대화의 이력·턴 구분 | 도메인 메시지를 런타임 메시지로 변환해 전달 |
| 외부 업무 상태 | 도구 결과 대응, 사용자 확인, 외부 실행 재개 | 서비스·도구 계약에서 별도로 설계할 영역 |

- LangGraph의 체크포인터는 특정 thread의 실행 상태를 저장한다. 여러 thread가 공유할 애플리케이션 데이터는 store와 구분한다. [Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- `MemorySaver`는 프로세스 메모리 구현이다. 프로세스 재시작 후 복구 가능한 영속 저장소를 얻은 것은 아니다. [MemorySaver의 저장 범위](https://docs.langchain.com/oss/javascript/langgraph/persistence#memorysaver-does-not-persist-between-restarts)
- 당시 `thread_id`는 대화 ID가 아니라 **요청 ID 또는 새 UUID**였다. 체크포인터가 존재한다는 이유만으로 사용자 대화 전체가 자동으로 이어진다고 해석할 수 없다.
- Phase 2의 출력은 도구 호출이 남아 있으면 `isDone: false`를 전달하는 형태였다. 후속 단계의 `result.status`, `snapshot`, 확인·서브에이전트 재개 계약까지 이 시점에 완성되어 있었다고 볼 수 없다.

## Adapter를 남긴 이유

**실행 엔진을 바꿔도 제품의 입출력 계약은 서비스가 소유해야 했다.**

- 클라이언트는 LangChain의 메시지 객체 대신 서비스가 정의한 요청과 응답을 주고받는다.
- Adapter는 입력 메시지를 변환하고 런타임 출력을 텍스트, 도구 호출, 완료 정보로 바꾼다.
- HTTP 핸들러는 이 결과를 SSE로 전송한다. 런타임 스트리밍과 네트워크 전송은 각각의 책임으로 남는다.
- 이러한 경계는 런타임 교체가 클라이언트 계약 전체로 번지는 것을 제한한다. 다만 새 런타임이 동일한 도구·중단·완료 의미를 구현하는지는 별도 검증이 필요하다.

| 런타임에 맡기는 것 | 서비스가 계속 책임지는 것 |
| --- | --- |
| 모델·메시지·도구 실행 기반 | 외부 도구의 실제 수행 위치와 결과 대응 |
| 실행 상태를 저장할 수 있는 메커니즘 | 요청·대화·업무 식별자와 상태 수명 |
| 스트리밍 출력 | 사용자에게 보여줄 이벤트 형식과 완료 의미 |
| 스킬을 사용할 수 있는 문맥 구성 | 스킬 정의의 로딩·검증·배포 정책 |
| 에이전트 구성을 확장하는 접점 | 확인 절차, 도메인 검증, 오류 복구 정책 |

## 기본 구성을 받아들이는 비용도 있었다

**공통 구현을 줄이는 대신, 라이브러리의 기본 동작을 이해하고 조정하는 일이 생겼다.**

- 제공된 도구와 지침은 모델 입력과 선택 가능한 행동에 영향을 준다. 기능을 사용할 수 있다는 이유만으로 모두 노출할 필요는 없다.
- 이후 코드에는 내장 planning 도구를 끄고 기본 프롬프트·도구를 줄이는 변경이 실제로 남아 있다.
- 6월 18일의 HarnessProfile은 기본 도구 목록과 범용 서브에이전트를 제한하고 불필요한 지침을 정리했다. 이것은 Phase 2의 초기 설정이 아니라 후속 조정이다.
- 현재 구조에서는 Fast 계층이 `createAgent`, Deep 계층이 `createDeepAgent`를 사용한다. 모든 요청에 같은 구성을 적용할 필요가 없다는 방향으로 발전한 셈이다.
- 라이브러리 도입으로 반복 제어 코드가 줄어도 버전 변경, 메시지 형식, 미들웨어 순서, 상태 식별자의 비용은 남는다.

## 이 선택을 평가할 때 확인할 것

**이 전환의 판단 기준은 서비스가 소유해야 할 코드에 집중할 수 있었는가다.** 실제 도입 기록에서는 자체 Planner·Runner 반복 구조를 제거하고, Adapter와 도구·스킬 연결을 중심으로 구현을 재구성한 변화가 확인된다.

| 평가 관점 | 비교할 내용 | 이 글에서 확인한 수준 |
| --- | --- | --- |
| 구현 책임 | 직접 유지하는 반복 제어와 상태 전달 코드 | 도입 전후 코드로 확인 |
| 기능 확장 | 도구·스킬·모델 연결 시 바뀌는 범위 | 초기 연결과 후속 구현으로 확인 |
| 상태 정확성 | 요청 재시도, 중단, 재개 후 메시지·도구 대응 | 별도의 시나리오 검증이 필요 |
| 성능·비용 | 같은 모델·도구·시나리오에서 지연시간, 호출 수, 토큰 사용 | 비교 측정 자료는 이 글의 근거에 포함하지 않음 |
| 유지보수 | 업그레이드와 기본 동작 조정 비용 | 후속 경량화 변경에서 비용의 존재 확인 |

다음 설계 질문은 **모든 요청에 같은 실행 구성이 필요한가**였다. 이 질문이 이후 Fast/Deep 계층 분리와 호출 경계의 변화로 이어진다.

## 구현 근거와 읽을거리

- 아래 커밋과 경로는 원본 프로젝트의 구현 근거다. 이 포트폴리오 저장소의 커밋이나 경로를 뜻하지 않는다.
- 도입 의도 전체를 코드만으로 복원한 것은 아니다. 실행 루프·상태 관리 부담이라는 회고를 출발점으로, 실제로 바뀐 책임을 대조했다.

| 확인 대상 | 기준 | 코드 근거 |
| --- | --- | --- |
| 자체 계획·실행 반복 | `a2008ec3` | `core/orchestrator/orchestrator.ts`, `core/subtask/subtask-runner.ts` |
| 런타임 전환과 Adapter | `8e470a79` | `deepagents/deep-agent-client.ts`, `deepagents/deep-agent-adapter.ts`, `core/agent/agent-adapter.ts` |
| 도구와 체크포인터 | `074914a8` | `deepagents/deep-agent.ts`, `deepagents/message-stream-assembler.ts` |
| 스킬·에이전트 정의 연결 | `7cdab641` | `deepagents/cognitive-supervisor-agent.ts`, `deepagents/cognitive-supervisor-agent-adapter.ts`, `deepagents/skills.ts` |
| 후속 기본 구성 경량화 | `22def55c` | `deepagents/deep-agent-harness-profile.ts` |
| 현재 두 실행 경로 | `fde590ec` | `deepagents/deep-agent-factory.ts`, `deepagents/fast-tier/fast-tier-csa.ts`, `deepagents/deep-tier/deep-tier-csa.ts` |

- [LangChain 개요](https://docs.langchain.com/oss/javascript/langchain/overview): 모델·도구·미들웨어를 조합하는 기반.
- [LangGraph 개요](https://docs.langchain.com/oss/javascript/langgraph/overview): 상태를 가진 실행 흐름의 기반.
- [Deep Agents 개요](https://docs.langchain.com/oss/javascript/deepagents/overview): harness의 구성과 확장 지점.
- [Persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence): checkpointer와 store, 메모리 구현의 범위.
- [Skills](https://docs.langchain.com/oss/javascript/deepagents/skills): 스킬을 실행 문맥에 연결하는 방식.
