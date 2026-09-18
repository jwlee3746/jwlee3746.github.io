---
title: '[Agent] deepagents 0.7.15 업데이트: 대화 fork와 운영 안정성'
excerpt: deepagents 0.7.8 이후 0.7.15까지의 변경을 확인하고, subagent conversation fork·rubric hook·파일 도구 안정화가 실제 설계에 주는 영향을 정리합니다.
date: '2026-09-18'
category: Agent
tags:
- LangChain
- Deep Agents
- Subagent
- Evaluation
permalink: /posts/deepagents-0-7-15-update/
toc: true
---

> 이 글은 2026년 9월 18일에 확인한 [deepagents 공식 changelog](https://github.com/langchain-ai/deepagents/blob/main/libs/deepagents/CHANGELOG.md), [GitHub Releases](https://github.com/langchain-ai/deepagents/releases), [PyPI](https://pypi.org/project/deepagents/)를 기준으로 작성했다. 당시 Python SDK 최신 버전은 **0.7.15**이며, 빠르게 바뀌는 0.x 프로젝트이므로 설치 전 최신 릴리스 노트를 다시 확인하는 편이 좋다.

deepagents에 업데이트가 있는지 다시 확인해 보니, 0.7.8 이후 **0.7.9부터 0.7.15까지 일곱 번**의 Python SDK 릴리스가 나왔다. 가장 큰 기능 변화는 subagent가 부모의 대화 문맥을 이어받는 conversation fork다. 나머지는 rubric grader 확장, 파일 도구의 결과 계약, compaction과 tool-call 복구처럼 긴 실행을 운영할 때 드러나는 문제를 다듬는 데 집중한다.

## 먼저 결론

이번 구간을 한 문장으로 요약하면 **새 capability를 크게 늘리기보다, 위임된 agent가 어떤 문맥에서 일하고 긴 실행이 어떻게 실패하는지를 더 명시적으로 만든 업데이트**다.

| 버전 | 날짜 | 핵심 변경 |
| --- | --- | --- |
| 0.7.9 | 2026-08-25 | middleware trace 입력 비활성화, rubric 기준 누락 방지 |
| 0.7.10 | 2026-08-28 | sandbox `glob` 실패를 빈 결과와 구분 |
| 0.7.11 | 2026-08-28 | rubric grader integration hook 추가 |
| 0.7.12 | 2026-09-01 | subagent conversation fork 추가 |
| 0.7.13 | 2026-09-02 | 기존 `handoff` 모드를 `isolated`로 명명 |
| 0.7.14 | 2026-09-14 | `read_file` 출력 개선, compaction·tool-call 복구 보강 |
| 0.7.15 | 2026-09-16 | offload 경로 충돌과 subagent state 전파 수정 |

업그레이드 우선순위는 사용 방식에 따라 다르다.

- subagent에게 부모 대화 전체를 다시 설명하고 있었다면 `fork`를 검토한다.
- `RubricMiddleware`로 완료 조건을 검사한다면 0.7.9와 0.7.11의 변경이 직접적이다.
- 파일 탐색·수정과 긴 대화를 많이 수행한다면 0.7.14~0.7.15의 오류 복구 수정 때문에 올릴 이유가 충분하다.
- `mode="handoff"`를 사용했다면 이름을 `isolated`로 바꾼다.

## 가장 큰 변화: subagent가 부모 대화를 fork한다

0.7.12에서 declarative `SubAgent`에 `mode="fork"`가 추가됐다. 기존 기본 동작인 `isolated`는 위임 설명만 전달하지만, `fork`는 부모의 대화 이력을 복사해 그 지점부터 subagent가 이어서 작업하게 한다.

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    model="openai:your-model",
    subagents=[
        {
            "name": "reviewer",
            "description": "현재까지의 조사와 초안을 검토한다.",
            "mode": "fork",
            "system_prompt": "근거가 약한 주장과 빠진 반례를 찾아라.",
        }
    ],
)
```

공식 API 설명을 기준으로 두 모드의 차이는 다음과 같다.

| 모드 | subagent가 받는 문맥 | 적합한 작업 |
| --- | --- | --- |
| `isolated` | `task`에 적힌 위임 설명 | 문맥을 제한해야 하는 독립 조사, 작은 작업 |
| `fork` | 부모의 대화 이력 + 위임 설명 | 초안 리뷰, 진행 중 디버깅, 앞선 판단을 이어가는 작업 |

이 변화는 단순한 편의 기능이 아니다. 이전에는 부모가 대화에서 중요한 내용을 추려 task description에 다시 압축해야 했다. 이 과정에서 근거, 사용자 제약, 이미 실패한 시도가 빠질 수 있었다. `fork`는 그 정보 손실을 줄인다.

대신 비용과 격리의 trade-off가 생긴다.

- 긴 부모 대화를 그대로 넘기므로 입력 토큰이 늘 수 있다.
- subagent에게 보여 주지 않아야 할 대화 내용까지 전달될 수 있다.
- fork된 subagent는 다시 subagent를 호출할 수 없다.
- subagent 고유 `system_prompt`는 상속한 prompt 뒤에 붙고, 별도 `skills`는 정의할 수 없다.

따라서 모든 위임을 `fork`로 바꾸기보다는 **부모의 판단 과정 자체가 작업 입력인가**를 기준으로 고르는 편이 낫다. 검색 키워드 하나를 조사하는 일은 `isolated`, 현재 작성 중인 보고서의 논리적 빈틈을 찾는 일은 `fork`가 자연스럽다.

### `handoff`가 아니라 `isolated`

0.7.13은 이 기존 모드의 이름을 `handoff`에서 `isolated`로 바꿨다. “handoff”는 부모 문맥을 넘겨주는 것처럼 들리지만 실제 동작은 위임 설명만 전달했기 때문에, 새 `fork`와 대비되는 이름으로 정리한 것이다.

```python
# 이전 표기
{"name": "researcher", "description": "...", "mode": "handoff"}

# 현재 표기
{"name": "researcher", "description": "...", "mode": "isolated"}
```

현재 소스에는 `handoff`가 legacy alias로 남아 있지만 공개 타입과 오류 메시지는 `isolated`와 `fork`를 기준으로 한다. 호환 alias가 사라지기 전에 설정과 테스트 fixture를 바꿔 두는 편이 안전하다.

## RubricMiddleware: 평가 결과를 운영 코드로 연결한다

`RubricMiddleware`는 agent가 답을 마치려 할 때 rubric을 기준으로 결과를 채점하고, 기준을 충족하지 못하면 다시 수정하게 한다. 이번 업데이트에서는 두 부분이 보강됐다.

0.7.9는 grader가 일부 criterion만 평가하고 전체를 통과한 것처럼 끝내지 못하도록 **모든 기준의 평가 결과를 요구**한다. 0.7.11은 각 평가가 끝났을 때 결과를 받을 수 있는 integration hook을 추가했다.

```python
from deepagents import create_deep_agent
from deepagents.middleware.rubric import RubricMiddleware

def record_evaluation(evaluation):
    print(evaluation)

agent = create_deep_agent(
    model="openai:your-model",
    middleware=[
        RubricMiddleware(
            model="openai:your-grader-model",
            max_iterations=3,
            on_evaluation=record_evaluation,
        )
    ],
)

result = agent.invoke(
    {
        "messages": [{"role": "user", "content": "조사 결과를 요약해 줘."}],
        "rubric": "모든 수치에 출처가 있고, 반대 근거를 하나 이상 다룬다.",
    }
)
```

여기서 hook은 관측용이다. 공식 docstring은 callback 예외가 로그만 남기고 억제되므로 control flow를 강제하는 용도로 쓰지 말라고 명시한다. 배포 차단이나 재시도 분기는 반환 state의 `_rubric_status` 또는 `rubric_evaluation_end` stream event를 기준으로 구현해야 한다.

이 구분은 평가 파이프라인에서 중요하다.

- `on_evaluation`: metric, 로그, 외부 관측 시스템 연동
- `_rubric_status`: 최종 성공·실패에 따른 애플리케이션 분기
- stream event: UI에 평가 진행 상태 표시

즉 “grader가 실행됐다”와 “grader 결과가 실제 실행 정책을 바꾼다”를 같은 callback에 넣지 않는 설계다.

## 파일 도구는 성공과 실패를 더 정확히 구분한다

파일 도구 관련 변경은 화려하지 않지만 agent 행동에는 직접 영향을 준다. 모델은 구조화된 backend 결과가 아니라 렌더링된 tool result를 보고 다음 행동을 결정하기 때문이다.

### 빈 결과와 탐색 실패를 구분

0.7.10부터 sandbox `glob` 자체가 실패했을 때 이를 “일치하는 파일 없음”으로 바꾸지 않는다. 둘을 합치면 agent는 권한, timeout, backend 장애를 검색 결과가 없는 것으로 오판하고 잘못된 결론을 낼 수 있다.

```text
No files found        # 검색은 성공했지만 결과가 없음
backend/tool error    # 검색 자체가 실패함
```

운영 측에서도 전자는 정상적인 domain result이고 후자는 retry·fallback·알림 후보이므로 구분할 필요가 있다.

### `read_file` 출력 계약 변경

0.7.14는 `read_file`의 출력 형식을 다시 손봤다. 같은 릴리스에서 빈 read window를 빈 파일로 경고하던 문제, `ls`와 `glob`의 문자 수 계산, `glob` 호출에서 `path`가 필요할 때의 안내도 수정됐다.

사람에게는 작은 formatting 변화지만 tool output 문자열을 직접 파싱하는 코드가 있다면 호환성 변경이다. 가능하면 문자열 대신 backend의 structured result를 사용하고, snapshot test가 있다면 업그레이드와 함께 갱신해야 한다.

### `edit_file`의 빈 검색 문자열 차단

0.7.14부터 `edit_file`은 빈 `old_string`을 거부한다. 빈 문자열 교체는 삽입 위치가 모호하고 의도치 않은 대량 변경으로 이어질 수 있다. 파일 전체를 교체하려면 `write_file`, 특정 내용을 바꾸려면 비어 있지 않은 `old_string`을 쓰는 식으로 작업 의도가 갈린다.

## 긴 실행을 위한 compaction과 tool-call 복구

긴 agent run에서는 모델의 마지막 답보다 중간 상태 복구가 더 중요할 때가 많다. 0.7.14와 0.7.15는 이 경계를 집중적으로 보강했다.

### compaction recovery에 상한과 입력 검증 추가

0.7.14는 compaction recovery가 무한히 이어지지 않도록 범위를 제한하고 input budget을 검증한다. context가 임계치를 넘을 때 요약과 재시도를 반복하는 시스템은 recovery 자체가 새로운 실패 루프가 될 수 있다. 이 변경은 실패를 무조건 숨기기보다 제한된 횟수 안에서 복구하고, 잘못된 budget은 일찍 드러내는 방향이다.

### 불완전한 tool call 보정

같은 버전에서 `PatchToolCallsMiddleware`가 partial tool call을 보정하고, 보정해 만든 `ToolMessage`의 내용도 함께 맞추도록 수정됐다. streaming 중 잘린 tool call이나 provider별 메시지 차이가 transcript를 깨뜨리면 이후 모델 turn까지 연쇄적으로 실패할 수 있기 때문이다.

### offload 파일명 충돌 방지

0.7.15는 ID가 없는 큰 tool result를 파일로 offload할 때 각각 고유 경로를 부여한다. 이전에는 식별자가 없는 여러 결과가 같은 경로에 놓여 덮어쓸 가능성이 있었다. 큰 검색 결과나 병렬 도구 실행을 자주 사용한다면 결과 provenance에 영향을 주는 수정이다.

### custom subagent state 전파 수정

subagent에 별도 middleware를 제공했을 때 그 middleware가 선언한 state key가 제대로 전파되도록 수정됐다. built-in state만 쓰는 단순 구성에는 차이가 없지만, custom middleware로 rate limit 정보나 실행 메타데이터를 들고 다녔다면 0.7.15에서 확인할 부분이다.

## 업그레이드 체크리스트

0.7.8 이하에서 0.7.15로 올린다면 다음 순서로 확인한다.

1. `pip install -U deepagents==0.7.15`처럼 먼저 버전을 고정한다.
2. subagent의 `mode="handoff"`를 `mode="isolated"`로 바꾼다.
3. 부모 대화가 필요한 작업만 `mode="fork"`로 전환하고 토큰 사용량을 비교한다.
4. fork에 민감한 대화 정보가 포함되지 않는지 확인한다.
5. `read_file`, `glob`, `ls`의 출력 문자열을 파싱하거나 snapshot으로 고정한 테스트를 실행한다.
6. sandbox `glob` 오류를 빈 결과로 가정한 fallback 로직이 없는지 확인한다.
7. rubric hook은 관측에만 쓰고, 성공 여부 분기는 state나 stream event로 처리한다.
8. 병렬로 큰 tool result를 offload하는 통합 테스트를 추가한다.
9. custom subagent middleware를 쓴다면 state key가 왕복하는지 검증한다.

최소한의 회귀 테스트는 세 가지면 된다.

```text
isolated subagent → 부모의 불필요한 문맥이 보이지 않는다
fork subagent     → 부모의 핵심 제약과 이전 결정을 이어받는다
filesystem error → "검색 결과 없음"과 실제 backend 실패가 구분된다
```

## 정리

0.7.9~0.7.15의 방향은 **더 자율적인 agent**보다 **더 설명 가능한 실행 경계**에 가깝다.

- `isolated`와 `fork`로 subagent의 context 경계를 선택한다.
- rubric의 모든 criterion을 확인하고 평가 hook으로 관측한다.
- 빈 검색 결과와 backend 실패를 구분한다.
- compaction, partial tool call, offload 충돌을 제한된 방식으로 복구한다.

특히 conversation fork는 유용하지만 기본값이 아니다. 문맥 전달 누락을 줄이는 대신 비용과 정보 노출 범위를 키우기 때문이다. 결국 좋은 multi-agent 설계는 subagent 수를 늘리는 일이 아니라, **각 위임에 필요한 최소 문맥을 고르는 일**에서 시작한다.

## 참고 자료

- [deepagents 0.7.15 — GitHub Releases](https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.15)
- [deepagents 공식 changelog](https://github.com/langchain-ai/deepagents/blob/main/libs/deepagents/CHANGELOG.md)
- [Subagents API source](https://github.com/langchain-ai/deepagents/blob/main/libs/deepagents/deepagents/middleware/subagents.py)
- [RubricMiddleware API source](https://github.com/langchain-ai/deepagents/blob/main/libs/deepagents/deepagents/middleware/rubric.py)
- [deepagents on PyPI](https://pypi.org/project/deepagents/)
