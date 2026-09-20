---
title: '[프로젝트] OpenClaw는 프롬프트를 어떻게 조립하는가'
excerpt: OpenClaw의 실제 소스를 따라 워크스페이스 지침, 도구 스키마, 스킬 목록, 실행 상태가 모델 입력으로 조립되는 과정과 디바이스 어시스턴트에 적용할 경계를 정리합니다.
date: '2026-09-20'
category: Agent
tags:
- 기타
permalink: /posts/device-assistant-prompt-harness/
toc: true
---

**OpenClaw는 워크스페이스 파일을 읽는 단계, 실행 환경을 수집하는 단계, 프롬프트를 렌더링하는 단계를 나누고, 실제 도구 스키마와 함께 모델에 전달한다.**

- 출발점: 디바이스 어시스턴트에 OpenClaw를 적용하며 확인한 프롬프트와 도구 계약의 불일치.
- 이 글의 중심: 일반적인 설계 제안에 앞서 **OpenClaw가 실제로 어떤 정보를 어디에서 조립하는지** 확인.
- 확인 기준: 2026-09-20의 공개 소스 [`41bc123fcb29`](https://github.com/openclaw/openclaw/tree/41bc123fcb29d2ab7443517e9f68e1b104f603b1). 아래 소스 링크는 이 커밋에 고정.
- 설명 범위: 공통 프롬프트 빌더와 embedded 실행 경로. 외부 하네스는 파일 주입 위치와 메시지 전달 방식이 다를 수 있음.

## 1. 워크스페이스 파일은 각각 다른 지침을 맡는다

**파일에 적은 도구 사용법과 실제로 호출 가능한 도구는 별도로 관리한다.**

| 입력 | OpenClaw에서 맡는 역할 | 구분할 점 |
| --- | --- | --- |
| `AGENTS.md` | 운영 규칙, 우선순위, 메모리 사용 지침 | 에이전트가 어떻게 행동할지 설명 |
| `AGENTS.md`의 `## Tools` | 로컬 환경의 도구 메모와 사용 관례 | 도구 등록이나 권한 부여가 아님 |
| `SOUL.md` / `IDENTITY.md` | 말투·경계 / 이름·정체성 | 실행 도구의 입력 계약과 분리 |
| `USER.md` | 사용자의 지속적인 선호와 프로젝트 맥락 | 선택적 파일이며 별도 크기 제한 적용 |
| `BOOTSTRAP.md` | 새 워크스페이스의 초기 설정 절차 | 초기 설정을 마친 뒤 일반 지침처럼 계속 넣지 않음 |
| `MEMORY.md` | 오래 유지할 사실·결정·요약 | 세션의 공개 범위와 메모리 설정에 따라 주입 제한 |
| `skills/*/SKILL.md` | 특정 작업을 수행하는 절차 | 전체 본문을 처음부터 모두 넣지 않음 |

- `memory/YYYY-MM-DD.md`의 일별 기록은 일반 턴의 bootstrap 본문에 자동으로 모두 포함되지 않음. 필요한 내용은 메모리 도구로 조회.
- 현재 소스의 bootstrap 파일 목록에는 **`TOOLS.md`가 없음**. 상수 이름이 남아 있는 것과 기본 주입 대상인 것은 다른 문제.
- `openclaw doctor --fix`의 마이그레이션은 기존 `TOOLS.md`를 보관하고, 사용자 지정 내용이 있으면 `AGENTS.md`의 `## Tools`에 병합.
- 따라서 이전 적용 경험의 `AGENTS.md`·`TOOLS.md` 분리를 현재 OpenClaw의 기본 파일 구조로 설명하면 맞지 않음.

근거: [워크스페이스 파일 안내](https://docs.openclaw.ai/concepts/agent-workspace), [실제 bootstrap 파일 목록](https://github.com/openclaw/openclaw/blob/41bc123fcb29d2ab7443517e9f68e1b104f603b1/src/agents/workspace-bootstrap-policy.ts), [TOOLS.md 마이그레이션](https://github.com/openclaw/openclaw/blob/41bc123fcb29d2ab7443517e9f68e1b104f603b1/src/commands/doctor-tools-md-migration.ts).

## 2. 실행 환경을 수집한 뒤 공통 빌더로 조립한다

![OpenClaw의 워크스페이스 로딩, 런타임 입력 수집, 설정 해석, 프롬프트 렌더링과 별도 도구 스키마 전달 흐름](/data/images/posts/device-assistant-prompt-harness/openclaw-prompt-flow.svg)

*OpenClaw 공개 소스의 책임 경계를 요약한 도표. 함수 사이의 모든 호출을 펼친 콜 그래프는 아니며, 외부 하네스의 전달 방식은 별도다.*

| 단계 | 실제 함수·모듈 | 처리 내용 |
| --- | --- | --- |
| ① 파일 읽기 | `loadWorkspaceBootstrapFiles` | 정해진 파일을 읽고 경로·내용·누락 여부를 수집 |
| ② 주입 대상 결정 | `resolveBootstrapFilesForRun` | 세션·메모리·초기 설정 조건에 따라 필터링하고 bootstrap hook 적용 |
| ③ 크기 제한 | `resolveBootstrapContextForRun` | 파일별·전체 예산 안에서 `contextFiles` 생성 |
| ④ 실행 입력 준비 | 런타임 어댑터 | 현재 도구, 스킬 목록, 채널 기능, 샌드박스, 모델·실행 정보를 수집 |
| ⑤ 설정 해석 | `buildConfiguredAgentSystemPrompt` | 내부의 `resolveAgentSystemPromptConfig`로 설정 값을 해석하고 빌더 호출 |
| ⑥ 문자열 렌더링 | `buildAgentSystemPrompt` | 전달받은 값으로 Tooling·Skills·Project Context 등 섹션 구성 |
| ⑦ 실행용 변환 | `buildAttemptSystemPrompt` | embedded 프롬프트에 provider 변환을 적용하고 안정·동적 영역 관리 |

- **핵심 경계:** `buildAgentSystemPrompt`는 전달받은 입력을 렌더링. 파일 읽기나 전역 설정 조회를 빌더 안에 섞지 않음.
- `resolveBootstrapFilesForRun`은 hook 적용 후에도 파일을 다시 필터링·정리. 파일을 추가하는 확장점에도 세션 조건이 적용됨.
- `getOrLoadBootstrapFiles`는 턴마다 파일을 다시 확인하고, 내용과 파일 식별 정보가 같으면 기존 스냅샷을 재사용. 이 경로에서는 긴 세션도 파일 수정 내용을 다음 턴에 반영할 수 있음.
- 원본 파일 전체와 실제 주입된 내용은 다를 수 있음. 크기 제한을 넘으면 축약된 사본이 모델에 전달되므로 파일 원문만 검토해서는 부족.

근거: [bootstrap 로딩·필터링](https://github.com/openclaw/openclaw/blob/41bc123fcb29d2ab7443517e9f68e1b104f603b1/src/agents/bootstrap-files.ts), [턴별 파일 스냅샷](https://github.com/openclaw/openclaw/blob/41bc123fcb29d2ab7443517e9f68e1b104f603b1/src/agents/bootstrap-cache.ts), [설정 해석과 빌더 호출](https://github.com/openclaw/openclaw/blob/41bc123fcb29d2ab7443517e9f68e1b104f603b1/src/agents/system-prompt-config.ts), [embedded 실행용 변환](https://github.com/openclaw/openclaw/blob/41bc123fcb29d2ab7443517e9f68e1b104f603b1/src/agents/embedded-agent-runner/run/attempt-system-prompt.ts).

## 3. 도구는 실행 계약으로, 스킬은 필요한 절차로 전달한다

| 구분 | 모델에 전달하는 정보 | OpenClaw의 처리 |
| --- | --- | --- |
| 도구 사용 지침 | 언제 어떤 도구를 사용할지 | Tooling 등 자연어 섹션으로 안내 |
| 실제 도구 | 이름, 설명, 인자 스키마 | 런타임의 도구 정책을 반영한 호출 인터페이스로 전달 |
| 스킬 목록 | 사용 가능한 스킬의 이름·설명·위치 | `skillsPrompt`로 선택에 필요한 목록 제공 |
| 선택한 스킬 본문 | 해당 작업의 세부 절차 | 모델이 명확히 맞는 스킬을 골라 본문 조회 |

- 프롬프트 빌더는 현재 도구 이름을 집합으로 만들고, `exec`, `process`, `sessions_spawn` 등의 유무에 따라 관련 지침을 구성.
- Tooling 섹션에도 **`AGENTS.md`의 Tools 지침은 사용법을 안내할 뿐, 도구를 사용할 권한을 주지 않는다**는 경계를 명시.
- Skills 섹션은 작업과 명확히 일치하는 스킬을 읽도록 안내. 일반 경로는 제공된 위치를 `read`로 읽고, code mode에서는 `skills.read` 사용.
- 스킬이 여러 개 맞으면 가장 구체적인 것을 선택하도록 안내하며, 시작부터 여러 본문을 모두 읽도록 하지 않음.
- 스킬의 사용 가능 여부와 스냅샷 갱신도 런타임이 관리. **스킬이 목록에 있다고 그 안에서 언급한 모든 도구가 허용되는 것은 아님.**

**이 구조를 요청별 디바이스 capability 검색과 동일시하면 안 된다.**

- OpenClaw에서 확인한 동작: 현재 도구를 반영한 지침 구성, 사용 가능한 스킬 목록 제공, 선택한 스킬의 본문 조회.
- 디바이스 어시스턴트에서 추가할 부분: 사용자 요청·기기 상태를 기준으로 capability를 검색하고, 발견한 기능의 수명·권한·입력 스키마를 관리하는 계층.
- 기존 글의 `discover_relevant_capabilities(request)`와 `validate_contract(prompt, tools)`는 설명용 설계 예시. 위 과정을 그대로 수행하는 OpenClaw 함수가 아님.

근거: [실제 Tooling·Skills 렌더링](https://github.com/openclaw/openclaw/blob/41bc123fcb29d2ab7443517e9f68e1b104f603b1/src/agents/system-prompt.ts), [스킬의 조건·스냅샷·갱신](https://docs.openclaw.ai/tools/skills).

## 4. 자주 바뀌는 상태는 고정 지침과 수명을 나눈다

**현재 실행 상태를 바꾸기 위해 큰 워크스페이스 지침 전체를 매번 다르게 만들 필요는 없다.**

| 정보의 수명 | 예시 | 전달 방식 |
| --- | --- | --- |
| 비교적 안정적 | 워크스페이스 지침, 고정 메모리 사용법 | 내부 프롬프트 캐시 경계 앞쪽에 배치 |
| 턴마다 바뀜 | 현재 채널, 실행 정보, 권한 수준 | 동적 영역으로 분리 |
| 현재 실행의 스냅샷 | 실행 중인 명령·하위 에이전트·미디어 생성 상태 | 별도 Runtime Context 메시지로 전달 |
| 누적 대화 | 사용자 요청, 모델 응답, 도구 호출·결과 | 세션 이력으로 전달 |

- Runtime Context는 `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`와 종료 구분자로 감싸 런타임이 제공한 상태임을 표시.
- 시스템 지침은 사용 가능한 각 기능의 최신 스냅샷을 따르도록 안내. 비어 있는 상태도 `none`으로 표현해 이전 상태가 계속 유효한 것처럼 읽히지 않게 함.
- 실제 구현은 과거 Runtime Context 메시지를 정리하고 현재 요청에 속한 정보를 유지하는 처리를 포함.
- 캐시 경계는 전송을 위한 내부 구분. 최종 메시지 배치는 provider·하네스에 따라 달라지므로, 모든 정보를 같은 시스템 문자열에 붙인다고 가정하지 않음.

근거: [시스템 프롬프트의 안정·동적 영역](https://docs.openclaw.ai/concepts/system-prompt), [Runtime Context 메시지 관리](https://github.com/openclaw/openclaw/blob/41bc123fcb29d2ab7443517e9f68e1b104f603b1/src/agents/internal-runtime-context.ts).

## 5. 조립 결과는 어디에서 확인하는가

| 확인할 문제 | OpenClaw에서 볼 곳 | 확인 내용 |
| --- | --- | --- |
| 작성한 지침이 전달됐는가 | `/context list` | 주입 파일, 원본·주입 크기, 잘림 여부 |
| 무엇이 컨텍스트를 차지하는가 | `/context detail` | 파일·스킬 항목·도구 스키마별 크기 |
| 설정이 올바른 문구로 바뀌는가 | `system-prompt-config.test.ts` | 설정 해석과 최종 프롬프트의 대응 |
| 동적 정보가 안정 영역을 바꾸는가 | `system-prompt.cache-prefix.test.ts` | 세션 변경 시 공통 prefix와 도구 유지, 메시지 역할·경계 처리 |

- `/context`는 주입 구성과 크기를 살피는 진단 도구. 모델이 올바른 도구를 선택한다는 증명까지 제공하지는 않음.
- 공개 테스트를 읽어 **무엇을 검증하는지** 확인한 것이며, 이 글에서 OpenClaw 전체 테스트를 실행한 것은 아님.
- 디바이스 어시스턴트에는 동일 발화의 도구 선택·인자·추가 질문·사용자 안내를 비교하는 행동 평가를 별도로 추가해야 함.

근거: [컨텍스트 진단](https://docs.openclaw.ai/concepts/context), [설정 조립 테스트](https://github.com/openclaw/openclaw/blob/41bc123fcb29d2ab7443517e9f68e1b104f603b1/src/agents/system-prompt-config.test.ts), [캐시 경계·최종 요청 테스트](https://github.com/openclaw/openclaw/blob/41bc123fcb29d2ab7443517e9f68e1b104f603b1/src/agents/system-prompt.cache-prefix.test.ts).

## 6. 디바이스 어시스턴트에는 어떤 경계를 가져올까

**가져올 것은 파일 이름보다, 지침·실행 계약·현재 상태를 서로 다른 책임으로 관리하는 방식이다.**

![역할 지침과 도구 지침, 요청별 capability와 실행 상태가 하네스를 거쳐 모델 입력으로 조립되는 디바이스 어시스턴트 설계 예시](/data/images/posts/device-assistant-prompt-harness/prompt-assembly.svg)

*기존 적용기의 설계 예시를 보존한 도표. `AGENTS.md / TOOLS.md` 분리, capability 검색, 계약 확인은 디바이스 어시스턴트의 설명용 구성으로, 현재 OpenClaw의 기본 파일 목록이나 호출 흐름을 뜻하지 않는다.*

| 적용 과정의 문제 | OpenClaw에서 참고할 경계 | 디바이스 쪽에서 추가할 검증 |
| --- | --- | --- |
| 지침이 실제 스키마에 없는 인자를 요구 | 자연어 지침과 호출 스키마 분리 | 등록 도구·인자와 지침의 참조 비교 |
| 제한된 예약 도구에 반복 실행 지침을 그대로 적용 | 현재 도구 집합에 따른 안내 구성 | 지원 범위와 대체 안내를 시나리오로 평가 |
| 이전 요청의 capability가 계속 선택 후보로 남음 | 최신 Runtime Context와 과거 상태 분리 | 요청별 capability 스냅샷·만료 범위 명시 |
| 내부 도구 이름이 사용자 설명에 노출 | 런타임 문맥과 사용자 응답의 역할 구분 | 사용자 안내 표현까지 행동 평가 |

- 정책과 사용법은 지침에서 관리하고, 호출 가능 여부·권한·인자 검증은 실행 계층에서 확인.
- 검색 결과와 사용자 데이터는 운영 지침을 덮어쓰는 명령으로 취급하지 않음.
- 새 지침은 파일 원문, 실제 주입 결과, 호출 스키마를 함께 검토. placeholder·도구 참조 검사와 스냅샷 비교만으로 자연어 모순을 모두 잡을 수 없으므로 행동 평가를 병행.
- 역할 지침·도구 지침·capability 정의의 버전을 구분해 변경 이유를 추적.
- 파일·스킬·실행 상태의 갱신 시점은 각각 확인. 한 입력이 다음 턴에 갱신된다고 다른 입력도 같은 방식으로 갱신된다고 가정하지 않음.
