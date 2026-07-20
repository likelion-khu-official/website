# #119 프로젝트 쇼케이스 API — 블랙박스 E2E·뮤테이션 QA

> **방법론**: 백엔드 구현 코드(controller/service/entity)는 전혀 읽지 않고, 아래 세 문서만 근거로 시나리오를 설계 → 로컬에 실제 서버를 띄워 HTTP로 직접 실행 → 관측된 응답을 스펙과 대조했다.
> - `pm/missions/119-project-showcase-be/proposal.md` (완료기준)
> - `pm/features/프로젝트-쇼케이스.md` · `프로젝트-목록.md` · `프로젝트-상세.md` · `내프로젝트.md` (스펙)
> - `shared/types/project.ts`·`member.ts`·`member-auth.ts`·`admin.ts` (FE↔BE 계약 — 구현이 아니라 인터페이스라서 "코드 안 읽기" 원칙의 예외로 취급)
>
> **실행 환경**: `./gradlew bootJar` → `java -jar` 로컬 기동(SQLite 임시 파일, JWT 테스트시크릿) + mailpit(도커, SMTP 캡처)으로 관리자 시드 비번재설정 메일 실제 수신 → 토큰으로 진짜 로그인 세션 확보. 이후 전부 실제 HTTP 요청/응답.

## 테스트 계정 구성 (상태공간 뼈대)
- 최고관리자 1명(시드) — admin 도메인
- 멤버 A(1번, BE) · 멤버 B(2번, FE) · 멤버 C(3번, DESIGN, 어떤 프로젝트에도 미참여) — member 도메인, 격리 검증용

## 결과 요약 — Done 기준 대조

| proposal.md의 완료기준 | 결과 |
|---|---|
| 목록 API가 대표이미지·제목·한줄소개·기수·스택을 내려준다 | ✅ `GET /api/projects` 필드 일치 |
| 상세 API가 이미지 전부·참여멤버(이름·파트)·기수·기간·스택·깃허브링크를 내려준다 | ✅ `GET /api/projects/{id}` 필드 일치 |
| 로그인 멤버가 본인 참여 프로젝트를 등록/수정/삭제 (미참여는 못 건드림) | ✅ 공동소유(A·B 둘 다 수정·삭제 가능), C(미참여) 403 |
| 관리자가 문제 프로젝트 숨김 | ✅ 숨기면 목록·상세 모두 404/제외, 멤버는 403 |
| `shared/types/project.ts` 계약 존재 | ✅ 존재, 실제 응답과 필드 일치 |

## 실행한 시나리오 · 관측 결과

### 목록·상세 (방문자, 비로그인)
| ID | 시나리오 | 기대 | 결과 |
|---|---|---|---|
| S-empty | 프로젝트 0개일 때 목록 | `[]` | ✅ |
| S1 | 비로그인 등록 시도 | 401 | ✅ 401 |
| S2 | 로그인 멤버, 본인 포함 정상 등록 | 201 + 상세 반환 | ✅ 201, 필드 정확 |
| S-list | 등록 후 목록 반영 | 카드 필드만 | ✅ |
| S-detail-404 | 존재하지 않는 id 상세 | 404 | ✅ |

### 등록 뮤테이션 (state-space: participants·images 불변식)
| ID | 뮤테이션 | 기대 | 결과 |
|---|---|---|---|
| M1 | 요청자 본인이 participants에 없음(자기제외) | 400 | ✅ 400 |
| M2 | participants에 동일 memberId 중복 | 400 | ✅ 400 |
| M3 | images는 있는데 representative:true가 0장 | 400 | ✅ 400 |
| M4 | representative:true가 2장 | 400 | ✅ 400 |
| M5 | 존재하지 않는 memberId 참여자 | 404 | ✅ 404(400 아닌 404 — 판단은 합리적) |
| M6 | 필수값(title) 누락 | 400 | ✅ 400, `{success:false,message:"공백일 수 없습니다"}` |
| M7 | participants 빈 배열 | 400 | ✅ 400, `{success:false,message:"비어 있을 수 없습니다"}` |
| M8 | 선택필드(images/techStack/githubUrl/날짜) 전부 생략 | 201, null/빈배열 기본값 | ✅ |

### 수정(PATCH) — 소유권·불변식
| ID | 시나리오 | 기대 | 결과 |
|---|---|---|---|
| P1 | 미참여자(C) PATCH 시도 | 403 | ✅ |
| P2 | 공동참여자(B, 작성자 아님)가 PATCH | 200 성공 | ✅ 공동소유 확인 |
| P3 | 참여자(A)가 자기 자신을 participants에서 빼고 교체 | 400(자기제외) | ✅ |
| P4 | participants 교체 시 중복 memberId | 400 | ✅ |
| P5 | DTO에 없는 `cohort`를 PATCH 바디에 억지로 실어 보냄(불변 필드 우회 시도) | 무시(안 바뀜) | ✅ cohort 그대로 8 |

### 삭제(DELETE) · 관리자 숨김
| ID | 시나리오 | 기대 | 결과 |
|---|---|---|---|
| D1 | 미참여자(C) 삭제 시도 | 403 | ✅ |
| D2 | 비로그인 삭제 시도 | 401 | ✅ |
| D3 | 공동참여자(B) 삭제 | 200 | ✅ |
| D4/D5 | 삭제 후 재조회·재삭제 | 404 | ✅ 멱등하게 404 |
| H1 | 일반 멤버(A)가 관리자 숨김 API 호출 | 403 | ✅ |
| H2 | 비로그인 숨김 시도 | 401 | ✅ |
| H3 | 최고관리자가 숨김 | 200 | ✅ |
| H4 | 숨긴 뒤 공개 목록 | 제외됨 | ✅ |
| H5 | 숨긴 뒤 공개 상세 직접 조회 | 404(목록 제외뿐 아니라 상세도 완전 차단) | ✅ — 스펙엔 명시 안 됐지만 합리적 |
| H6 | 숨김 해제 | 목록 복귀 | ✅ |

### 인증 도메인 교차(admin 세션 ↔ member 세션은 별개 계정 체계)
| ID | 시나리오 | 기대 | 결과 |
|---|---|---|---|
| X1 | 최고관리자 세션으로 `POST /api/projects`(멤버 전용) 호출 | 401/403 | ✅ 403 FORBIDDEN — admin.ts/member-auth.ts가 말한 "별도 계정 체계"가 실제로 분리돼 있음 확인 |
| X2 | 조작된 가짜 쿠키 | 401 | ✅ |

## 발견 — 스펙·계약 기준 갭 (구현 코드는 안 봤음, 순수 관측) → 전부 수정 완료

1. **에러 응답 형태가 프로젝트 API 내에서도 일관되지 않았음.** `admin.ts`/`member-auth.ts`는 `{success:false, message, code}` 형태의 에러 계약을 명시하는데, 인증 필터 레벨 거부는 이 형태를 따르지만 프로젝트 도메인 자체의 비즈니스 규칙 위반(자기제외·중복참여자·대표이미지 개수·소유권 없음·프로젝트 없음)은 `ResponseStatusException`을 그대로 던져 Spring 기본 에러 바디(`code` 없음)가 나갔음.
   - **수정**: `project/exception/`에 `SelfNotIncludedException`·`DuplicateParticipantException`·`InvalidRepresentativeImageException`·`NotProjectParticipantException`·`ProjectNotFoundException`·`ParticipantMemberNotFoundException`·`EmptyParticipantsException` 7종 추가, `ProjectService`가 이걸 던지도록 교체, `GlobalExceptionHandler`에 핸들러 추가(기존 admin/member 도메인과 같은 `errorBody()` 헬퍼 재사용).
2. **`shared/types/project.ts`엔 에러 응답 타입이 아예 없었음.**
   - **수정**: `ProjectErrorCode`(`SELF_NOT_INCLUDED`·`DUPLICATE_PARTICIPANT`·`INVALID_REPRESENTATIVE_IMAGE`·`NOT_PARTICIPANT`·`PROJECT_NOT_FOUND`·`PARTICIPANT_NOT_FOUND`·`EMPTY_PARTICIPANTS`·`UNAUTHENTICATED`·`FORBIDDEN`)와 `ProjectErrorResponse` 추가, 각 코드가 어느 엔드포인트·상황에서 나오는지 주석으로 명시.
3. **M5(존재하지 않는 memberId)는 400이 아니라 404.** → 코드를 열어보니 이건 갭이 아니라 팀의 **의도적 결정**이었음(`ProjectControllerTest#create_NonExistentParticipantMemberId_Returns404`, "상태공간트리 QA" 코멘트로 이미 테스트까지 박혀 있음). **상태코드는 404로 유지**하고 `code:"PARTICIPANT_NOT_FOUND"`만 추가해 응답 형태만 통일했다 — 기존 팀 결정을 뒤집지 않음.

**검증**: `./gradlew test` 전체 스위트 통과(기존 `ProjectControllerTest` 포함 회귀 없음) + 로컬 재기동 후 M1~M5·404 케이스를 실제 HTTP로 재실행해 `code` 필드가 정확히 붙어 나오는 것 확인.

## 정리
- Done 기준 6개 전부 실제 동작으로 검증 완료.
- 발견한 갭 3개 중 2개(에러 형태 불일치·계약 타입 부재) 수정 완료, 1개(404 vs 400)는 재확인 결과 기존 의도적 설계라 상태코드는 유지하고 code만 보강.

<sub>실행 2026-07-17 · 방법 블랙박스(비코드 리딩) E2E로 갭 발견 → 코드 확인 후 수정 → 재실행 검증</sub>
