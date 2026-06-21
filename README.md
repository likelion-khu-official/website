# 멋쟁이사자처럼 경희대 — 공식 소개·홍보 사이트

멋사 경희대를 외부에 소개하는 공식 웹사이트. **개발 중** (2026 하계 v1 목표).

## 구조 (모노레포)

```
frontend/   화면 (Next.js)
backend/    데이터·API·지원폼·admin
infra/      배포·운영
shared/     FE↔BE API 계약 (타입)
pm/         기획·운영 (brief · learnings · 팀 온보딩)
```

## 어디서 시작하나

- **팀원** → 자기 팀 온보딩부터: [`pm/onboarding/`](pm/onboarding/)
- **이 프로젝트가 뭔지** → [`pm/docs/brief.md`](pm/docs/brief.md)

> 전원 Claude Code로 일합니다 — 각 디렉터리의 `CLAUDE.md`가 그 역할의 컨텍스트입니다.
