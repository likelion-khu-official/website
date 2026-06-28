# 백엔드 — 하네스 (골격)

> 골격. BE 멤버/PM이 채워나간다.

## 시작 전 읽기
1. 루트 `CLAUDE.md`
2. `pm/docs/`: `learnings.md` → `brief.md`
3. `shared/` (FE↔BE API 타입)

## 오너십
데이터 모델·API·인증·admin/CMS·지원폼·모집상태.

## 역할 메모
- 비주얼 디자인 안 기다림 — 거친 흐름(와이어/IA)·데이터 요구로 병렬.
- API 계약은 `shared/`에 타입으로 노출(FE가 mock으로 먼저 씀).

## SecurityConfig 추가 시 필수 체크

SecurityFilterChain 빈을 직접 정의하는 순간 Spring Boot의 `ManagementWebSecurityAutoConfiguration`이 꺼진다.
그 결과 `/actuator/health`도 인증 대상이 되어 **CD 헬스체크가 조용히 깨진다**.

SecurityConfig를 만들 때 반드시:
```java
.requestMatchers(EndpointRequest.to(HealthEndpoint.class)).permitAll()
```
또는
```java
.requestMatchers("/actuator/health").permitAll()
```
를 포함할 것. `EndpointRequest` 방식이 포트·경로 변경에 더 강함.
