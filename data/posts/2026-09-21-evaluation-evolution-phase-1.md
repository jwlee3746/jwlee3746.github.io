---
title: '[평가의 진화 1] 2025년, 고정된 프롬프트에서 plan을 평가하다'
excerpt: llm-train과 plan-llm의 2025년 코드를 돌아보며 고정 입력·정답 기반 평가가 해결한 문제와 실제 실행까지 설명하지 못했던 경계를 정리한다.
date: '2026-09-21'
category: Evaluation
tags:
- Agent
- LLM Evaluation
- Planning
- Evaluation Harness
permalink: /posts/evaluation-evolution-phase-1/
toc: true
---

**2025년 평가의 중심 질문은 “이 문맥에서 모델이 올바른 다음 plan을 생성하는가?”였다.** 입력과 정답을 고정해 모델의 판단을 비교할 수 있었지만, 그 판단을 실제로 실행한 뒤 사용자의 목표까지 달성했는지는 별도의 문제였다.

- **시리즈의 출발점:** prompt 기반 planning 평가 → 판정 고도화 → agent harness → AES의 fixture replay → stateful simulator → 하이브리드 평가.
- **이번 글의 범위:** 2025년 `llm-train`과 `plan-llm`에서 확인한 입력 구성, 추론, 결과 기록과 채점의 경계.
- **관점:** 당시 평가가 해결한 문제를 먼저 보고, 이후 하네스와 simulator 평가가 필요해지는 이유를 연결한다.
- **읽는 순서:** 평가 단위 → 블록 다이어그램 → 실행 시퀀스 → 정답 이력의 의미 → 점수로 알 수 있는 것과 없는 것.
- **그림 읽기:** 모바일에서는 그림 전체를 축소해서 표시한다. 그림을 누르고 `100%`를 선택하면 본문 크기로 읽을 수 있다.

## 1. 무엇을 평가하고 있었나

**평가 대상은 주어진 문맥에 대한 모델의 출력이었다.** 발화와 대화 이력, 사용 가능한 함수 정보를 prompt에 담고, 생성된 plan을 기대값과 비교했다.

| 구성 요소 | 당시 평가에서의 역할 |
| --- | --- |
| Test case, TC | 발화·문맥·기대 결과를 담은 평가 사례 |
| WorldState | 대화 이력과 참조 대상을 prompt로 표현하기 위한 입력 상태 |
| Prompt builder | 상태와 schema 정보를 모델 입력으로 변환 |
| Model | 입력을 받아 agent·함수·파라미터·plan 등을 생성 |
| Ground truth | 해당 입력에서 기대하는 출력 |
| Grader | 실제 출력과 기대값을 비교해 정오답과 오류 정보를 생성 |

- **`llm-train`:** TC에서 평가 예제를 만들고, 모델 추론 결과를 파일로 남겨 후속 평가에 전달.
- **`plan-llm`:** prompt builder와 plan 해석 등 planning 서비스의 표현과 실행 경로를 제공.
- **공유된 표현:** `llm-train`의 `ExampleBuilder`는 `plan-llm`의 prompt builder와 WorldState·schema 관련 모듈을 활용.
- **구분할 상태:** TC에서 구성한 WorldState가 있다는 사실만으로 실제 tool 호출이 환경을 바꾸고 그 결과를 다시 관찰하는 평가가 되는 것은 아님.

### Single-turn은 “대화 이력이 없다”는 뜻이 아니다

[Anthropic의 agent eval 정리](/posts/demystifying-agent-evals-korean/)에서 다룬 single-turn 평가와 agent 평가의 구분을 이 구조에 적용하면, 먼저 **평가 단위**를 봐야 한다.

- **입력 문맥:** 이전 발화와 여러 step을 포함할 수 있음.
- **판정 단위:** 준비된 입력에 대한 한 번의 예측을 기대 출력과 비교.
- **집계 단위:** 개별 판정을 step·turn·conversation 수준으로 묶을 수 있음.
- **Episode 평가:** 실제 예측과 tool output이 다음 입력과 환경 상태를 결정하며 목표 달성까지 이어짐.

**긴 대화를 입력으로 주거나 여러 판정을 묶어도, 그것만으로 실제 episode를 실행한 평가는 되지 않는다.** 여기서 single-turn/component 평가라는 표현은 첫 두 항목의 평가 경계를 가리킨다. 당시 서비스에 decoder나 orchestration이 전혀 없었다는 의미는 아니다.

## 2. 평가 파이프라인: TC에서 prediction 파일까지

![2025년 prompt 기반 평가의 블록 다이어그램](/data/images/posts/evaluation-evolution-phase-1/evaluation-pipeline.svg)

*그림 1. TC를 입력·정답 쌍으로 바꾸고 prediction을 기록한 뒤 채점하는 구조. 실제 업무 도구 실행과 최종 환경 상태 검증은 이 경로의 바깥에 있다.*

1. **예제 구성:** TC의 발화·대화 문맥과 schema로 WorldState와 평가 target을 준비.
2. **입력 생성:** prompt builder를 거쳐 모델에 전달할 `input`과 비교할 `ground_truth`를 생성.
3. **추론:** 준비된 입력으로 모델을 호출하고 출력의 종료 조건에 따라 prediction을 수집.
4. **기록:** 실제 추론에 사용한 입력, 정답, prediction을 CSV와 줄 단위 JSON으로 저장.
5. **채점:** 저장된 결과에서 함수·파라미터 등 평가 대상에 맞는 비교를 수행.

- **비교하려는 변경:** 학습 checkpoint, 모델, prompt 등 모델의 판단을 바꾸는 요소.
- **고정할 조건:** 평가 데이터와 prompt 구성, schema·지원 함수 정보, 추론 설정과 채점 기준.
- **분리의 장점:** 동일한 prediction 파일을 두고 오답을 분석하거나 채점 결과를 다시 살펴볼 수 있음.
- **주의:** 입력을 고정해도 모델의 출력이 항상 결정적인 것은 아님. 여기서 재현성은 우선 **비교 조건을 통제할 수 있다는 의미**.

구체적인 경계는 [`ExampleBuilder`](https://github.ecodesamsung.com/bixby-platform/llm-train/blob/8880d7ca707db1a4d65729b1dd92d78822c7a4cc/data_builder/example_builder.py)와 [`PromptInference.process_single_example()`](https://github.ecodesamsung.com/bixby-platform/llm-train/blob/8880d7ca707db1a4d65729b1dd92d78822c7a4cc/inference/prompt_inference.py#L78)에서 확인할 수 있다.

## 3. 한 샘플의 실행: 생성과 채점을 분리한다

![평가 예제 하나의 준비, 추론, 기록, 채점 시퀀스](/data/images/posts/evaluation-evolution-phase-1/sample-sequence.svg)

*그림 2. 준비된 prompt로 추론하고 결과를 저장한 뒤 채점한다. Grader에 전달하는 prediction은 환경에서 실행한 결과가 아니라 모델이 생성한 출력이다.*

- **입력 전처리:** `process_single_example()`은 입력 표현에 따라 message 또는 ChatML을 처리하고 실제 추론에 쓴 입력을 결과에 반영.
- **기본 필드:** `input`, `ground_truth`, `target_type`을 읽고 결과에 `prediction`을 추가.
- **진행 중 지표:** 앞뒤 공백을 제거한 response와 target의 문자열 일치 여부로 정확도를 표시.
- **사후 판정:** plan scorer는 문자열 비교에 더해 plan을 파싱하고 함수·파라미터를 재귀적으로 비교.
- **측정 범위:** 추론 시간과 예측 결과를 기록하는 것이 실제 업무 도구의 실행 시간·성공을 측정하는 것과 같지는 않음.

**추론 화면의 exact match와 사후 grader의 판정은 같은 지표로 취급하면 안 된다.** 당시 평가 전체를 단순 문자열 일치로 설명하면 이미 존재하던 구조 비교를 놓치게 된다.

| 읽고 있는 결과 | 답하는 질문 | 추가 확인이 필요한 것 |
| --- | --- | --- |
| 추론 중 문자열 정확도 | 공백 정리 후 출력이 정답과 같은가? | 의미·구조가 같은 다른 표현도 허용하는가? |
| 함수·파라미터 판정 | 생성한 호출 구조가 기대 구조에 맞는가? | 비교 규칙이 허용하는 차이와 참조 처리 |
| Step·Turn·Conversation 집계 | 해당 집계 규칙에서 필요한 판정들이 통과했는가? | 실제 예측을 다음 실행에 이어 사용했는가? |
| 실제 task 성공률 | 환경에서 사용자의 목표를 달성했는가? | 도구 실행·상태 전이·최종 상태의 증거 |

- **근거:** [`evaluate_step_results()`](https://github.ecodesamsung.com/bixby-platform/llm-train/blob/8880d7ca707db1a4d65729b1dd92d78822c7a4cc/evaluation/eval_scorer.py#L157)와 [plan 결과 집계](https://github.ecodesamsung.com/bixby-platform/llm-train/blob/8880d7ca707db1a4d65729b1dd92d78822c7a4cc/evaluation/eval_plan.py).
- **다음 편의 범위:** 의미 유사도·entailment, LLM judge와 회귀 분석까지 판정을 확장한 과정. Phase 구분은 설명을 위한 것이며 해당 기능들이 순서대로 완전히 교체되었다는 뜻은 아님.

## 4. 여러 줄의 plan도 한 번씩 나눠 평가할 수 있었다

**정답 이력을 사용하는 평가에서는 이전 예측이 틀려도 다음 입력에 그 오류가 이어지지 않는다.** 모델의 각 판단을 분리해서 볼 수 있는 대신, 실제 오류 전파와 복구는 관찰하기 어렵다.

![여러 줄의 plan을 정답 prefix로 나누어 평가하는 시퀀스](/data/images/posts/evaluation-evolution-phase-1/gold-prefix-sequence.svg)

*그림 3. 첫 줄의 실제 예측 대신 첫 줄의 정답을 둘째 입력에 붙인다. 다음 예측은 올바른 이전 문맥이 주어졌을 때의 판단이다.*

[`clone_prompts_by_split_target()`](https://github.ecodesamsung.com/bixby-platform/llm-train/blob/8880d7ca707db1a4d65729b1dd92d78822c7a4cc/data_builder/example_builder.py#L411)은 다음과 같이 동작한다.

1. **조건 확인:** 평가 모드이고 target이 여러 줄일 때 분할 여부를 판단.
2. **첫 예제:** 초기 prompt를 입력으로, 첫 정답 줄을 target으로 사용.
3. **다음 예제:** 초기 prompt에 **이전 정답 줄**을 붙이고 다음 줄을 target으로 사용.
4. **반복:** 실제 prediction과 무관하게 정답 prefix를 늘려 각각의 평가 입력을 준비.

- **예외:** 한 줄 target과 평가 모드가 아닌 경우에는 분할하지 않음. NLG·grounding·summarization도 해당 분할에서 제외.
- **다이어그램의 의미:** 입력 간의 의존성을 보여주는 논리적 순서. 실제 배치 추론이 반드시 그림처럼 순차 실행된다는 뜻은 아님.
- **유용한 질문:** 올바른 이전 판단이 주어졌다면 모델이 이번 판단을 맞힐 수 있는가?
- **남는 질문:** 이전 판단이 틀렸을 때 실제 도구가 어떤 결과를 반환하며 모델은 어떻게 복구하는가?

예를 들어 첫 줄에서 잘못된 대상을 선택한 예측이 나와도, 둘째 평가 입력에는 정답 대상이 들어갈 수 있다. 둘째 줄의 통과는 그 문맥에서 올바른 함수를 생성했다는 의미이며, 잘못 고른 대상을 실제 실행 중 수정했다는 증거는 아니다.

## 5. “Plan을 맞혔다”와 “작업이 성공했다”의 차이

**“10분 타이머 하나 만들어 줘”라는 요청은 같은 발화로도 서로 다른 평가 질문을 만들 수 있다.** 아래는 평가 경계를 설명하기 위한 가상 사례이며 실제 TC나 측정 결과가 아니다.

| 확인할 항목 | 고정 prompt·plan 평가로 확인 가능한 범위 | 실행·상태 평가에 필요한 증거 |
| --- | --- | --- |
| 어떤 도구를 선택했는가? | 기대 타이머 생성 함수를 출력했는지 비교 | 실제 도구 호출 기록 |
| 지속시간이 올바른가? | 기대 인자에 10분이 표현됐는지 비교 | 도구 계약에 맞게 저장된 지속시간 |
| 타이머가 만들어졌는가? | 생성 호출을 출력했다는 사실 | 생성된 타이머의 존재와 활성 상태 |
| 정확히 하나인가? | 단일 출력이 기대 호출인지 확인 | 전체 실행 후 중복 생성 여부 |
| 실패 후 복구했는가? | 오류 문맥을 별도 입력으로 주어 후속 판단을 평가 가능 | 실제 오류·재시도·복구가 이어진 실행 기록 |

- **응답 유실 예시:** 도구가 타이머를 생성한 뒤 응답만 유실되면, 재시도로 두 개가 만들어질 가능성이 있음.
- **고정 사례의 역할:** “오류 응답을 받은 문맥에서 재시도할 것인가?”라는 판단을 별도 사례로 검사할 수 있음.
- **추가로 필요한 검증:** 실제 도구 계약에 맞는 오류를 발생시키고, 재시도 이후 최종 상태를 확인해야 중복 여부를 알 수 있음.
- **구분할 한계:** 실패 상황을 입력으로 표현할 수 없었던 것이 아니라, **모델의 실제 행동으로 그 상황이 발생하고 다음 행동으로 이어지는 과정**이 이 평가 경로에 포함되지 않았던 것.

## 6. 왜 이 방식으로 시작하는 것이 합리적이었나

**평가 단위를 좁히면 모델 변경의 영향을 분리해서 확인할 수 있다.** 고정 입력 평가에는 이후에도 유지할 이유가 있다.

- **원인 분리:** 같은 문맥에서 어떤 함수·인자를 잘못 생성하는지 직접 비교.
- **반복 비교:** TC와 조건을 유지해 checkpoint와 prompt 변경의 영향을 추적.
- **오답 자산화:** 알려진 판단 실패를 작은 입력·정답 쌍으로 보존.
- **환경 의존성 감소:** 업무 도구의 모든 상태 전이와 실패 조건을 구현하기 전에 모델 판단부터 확인.
- **분석의 편의:** 저장한 input·ground truth·prediction을 함께 보며 입력 문제와 출력 문제를 구분.

상대적으로 단순했던 지점은 정답 판정 자체가 항상 쉬웠다는 데 있지 않다. **평가기가 동적인 도구 환경과 전체 실행의 수명을 관리할 책임이 작았다**는 데 있다.

### 점수의 경계를 유지해야 한다

- **측정한 것:** 정해진 입력과 채점 규칙 아래에서 예측이 얼마나 맞는지.
- **자동으로 따라오지 않는 결론:** 실제 도구가 성공했는지, 오류가 전파되었는지, 목표 상태에 도달했는지.
- **추가 혼동:** `plan-llm`의 SA full-plan 배치 클라이언트에는 추출된 agent 목록에 `expectedAgent`가 포함되는지 확인하는 경로가 있음. 그 통과를 전체 plan의 모든 인자·순서·실행 효과 검증으로 해석할 수 없음.
- **코드 근거:** [SA full-plan 배치 판정](https://github.ecodesamsung.com/bixby-platform/plan-llm/blob/cbe8e1646c748152adaac6f65feb98391b0e857a/tests/test_clients/sa_test_client.py#L134).

## 7. 다음 단계: 더 좋은 grader로 무엇을 해결할 수 있을까

**첫 번째 확장은 모델의 출력을 더 정확하게 판정하는 일이었다.** 표현이 다르지만 같은 의미인 결과, 중첩된 함수, 여러 단계로 구성된 plan을 더 잘 비교해야 했다.

- **Phase 2의 질문:** 구조 비교·의미 비교·LLM judge·집계를 개선하면 어떤 오판정을 줄일 수 있는가?
- **끝까지 남는 경계:** grader가 정교해져도 입력을 정답 이력으로 복원하면 실제 오류의 전파와 복구는 측정되지 않음.
- **이후의 변화:** agent harness가 검색·tool 호출·상태 전달을 조율하면서 평가 대상이 모델과 하네스의 전체 행동으로 확대.
- **장기 방향:** AES의 고정 fixture 평가와, state·tool output을 실제 action에 따라 제공하는 simulator 평가를 함께 운영. 이 시리즈에서 다룰 **향후 설계 방향**이며 구현 완료를 뜻하지 않음.

고정 prompt 평가에서 얻은 판단 회귀 사례는 이후에도 활용할 수 있다. 그 점수가 답하는 질문을 분명히 하고, 실제 실행의 증거가 필요한 질문에는 환경과 상태 평가를 추가하는 것이 이 시리즈의 방향이다.

## 분석 범위와 참고 자료

- **분석 방법:** 로컬 소스와 Git 이력 확인. 모델·서비스를 실행해 정확도나 성능을 측정하지 않음.
- **2025년 기준:** `llm-train`의 `8880d7ca`(2025-12-27), `plan-llm`의 `cbe8e164`(2025-12-31).
- **서술 범위:** 2025년 평가의 기본 단위를 재구성한 설명. 연말 구현의 모든 기능이 연초부터 동일했다거나 당시의 모든 평가 경로가 이 구조였다는 뜻은 아님.
- **Phase의 의미:** 공식 출시 단계가 아니라 문제와 해결의 변화를 설명하기 위한 구분. 각 방식은 겹쳐 존재할 수 있음.
- **접근 조건:** 본문의 구현 링크는 분석 커밋에 고정한 GitHub Enterprise 주소로, 저장소 접근 권한이 필요함.
- **관련 글:** [Anthropic agent eval 정리](/posts/demystifying-agent-evals-korean/) · [TC 평가와 simulator 평가의 차이](/posts/test-case-vs-simulator-evaluation/) · [Hybrid Evaluation Architecture](/posts/hybrid-agent-evaluation-strategy/).
