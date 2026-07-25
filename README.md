<div align="center">

# 🎫 &nbsp; [**나의 티켓 — 여기서 시작**](https://github.com/orgs/likelion-khu-official/projects/1/views/5)

**내가 할 일이 여기 다 모여 있어요.** 로그인하면 각자 자기 티켓만 보입니다.
Claude Code를 쓴다면 그냥 한 마디 — `"나한테 할당된 미션 수행하자"`

</div>

---

## 우리가 일하는 법 — 티켓 (Jira 방식)

모든 일을 **티켓(GitHub 이슈)**으로 관리해요. Jira처럼 **4단계**로 쌓이고, 위가 아래를 품습니다. **아래가 다 끝나면 위가 자동으로 "완료"로 채워져요** — 상태를 손으로 관리할 필요가 없습니다.

| 단계 | 한마디로 | 예시 |
|:--|:--|:--|
| 🟪 **Epic** | 큰 묶음 (테마) | 프로젝트 쇼케이스 |
| 🟩 **Story** | 사용자가 실제로 쓰는 **기능 하나** | "방문자가 프로젝트 목록을 볼 수 있다" |
| ⬜ **Sub-task** | 그 기능을 만드는 **내 분야 작업** — 내가 맡는 티켓 | 목록 화면(FE) · 목록 API(BE) |
| 🟨 **Task** | 기능은 아니지만 해야 하는 **기술 작업** | 인프라 셋업 |

> 타입(Epic/Story/…)은 GitHub 이슈에 **뱃지**로 붙고, 분야(FE·BE·인프라·디자인)는 **라벨**로 붙습니다.

### 어디서 보나

| 링크 | 무엇 |
|:--|:--|
| 👤 [**나의 티켓**](https://github.com/orgs/likelion-khu-official/projects/1/views/5) | **← 여기서 시작.** 내가 맡은 티켓만 (각자 자기 것) |
| 📋 [로드맵 보드](https://github.com/orgs/likelion-khu-official/projects/1) | 팀 전체가 어디까지 왔나 (Epic ▸ Story ▸ Sub-task) |
| 🗺️ [Epic 목록](https://github.com/likelion-khu-official/website/issues?q=is%3Aissue+type%3AEpic) · 📖 [Story 목록](https://github.com/likelion-khu-official/website/issues?q=is%3Aissue+type%3AStory) | 테마·기능별로 |
| 🎫 [열린 티켓](https://github.com/likelion-khu-official/website/issues?q=is%3Aopen+label%3Aroadmap) | 지금 굴러가는 작업 (Sub-task / Task) |

테마 라벨(`area:*`)로도 거릅니다 — 랜딩 · 프로젝트 쇼케이스 · 멤버 로스터 · 운영진 소개 · 블로그 · 모집 · 인증·계정 · 멤버 영역 · 어드민 · 최고관리자.

**스펙(무엇이어야 하나)의 정본은 [서비스 위키](https://github.com/likelion-khu-official/website/wiki)**입니다. 각 Story가 위키를 링크하고, "됐다"의 판정(검증 결과)은 [`pm/qa/`](pm/qa/)에 남습니다. 구현·논의 전에 위키를 먼저 확인해 주세요.

> 💡 **기획에서 빠진 게 보이면 편하게 [티켓을 만들어 주세요](https://github.com/likelion-khu-official/website/issues/new).** 아직 Story가 없는 기능, 지금 필요한데 아무도 안 맡은 것, "이건 어떻게 동작해야 하지?" 싶은 애매한 지점 — 뭐든 좋아요.

<details>
<summary>📊 개발 지표 (2026-07-18 스냅샷)</summary>

<br/>

<sub>익명 방문자 관점 GWT 실집계 · 산출 정의: [pm/docs/metrics.md](pm/docs/metrics.md)</sub>

| 지표 | 값 | 읽는 법 |
|---|---|---|
| **검증 커버리지** | **69 %** — 66/96 | 전체 시나리오 중 pass/fail로 실제 확인된 비율 |
| **pass율** | **86 %** — 57/66 | 검증된 것 중 통과 — 반드시 커버리지와 쌍으로 읽는다 |
| **fail** | **9건** — 이슈 연결 4 · 미등록 5 | 미등록 fail이 곧 다음 티켓 후보 |

</details>

---

<div align="center">

<br/>

<sub>[멋쟁이사자처럼 · 경희대](https://github.com/likelion-khu-official) / 공식 사이트</sub>

# 🦁 &nbsp; Official Website

**동아리의 얼굴을 만듭니다.**
한 기수가 쓰고 버리는 사이트가 아니라, 계속 쌓아 올릴 자산을.

<br/>

[![Live](https://img.shields.io/badge/site-likelion--khu.com-000000?style=for-the-badge)](https://likelion-khu-website.vercel.app)
&nbsp;
[![Status](https://img.shields.io/badge/v1-in_progress-1f6feb?style=for-the-badge)](https://github.com/likelion-khu-official/website)

<br/>

</div>

---

## 우리가 보는 것

동아리의 활동은 매 기수 반복됩니다. 하지만 결과물은 흩어지고 사라집니다.
인스타에, 노션에, 개인 폴더에. 검색도 안 되고, 다음 기수로 이어지지도 않습니다.

**우리는 이걸 자산의 문제로 봅니다.** 그래서 세 가지를 목표로 합니다.

<br/>

<table>
<tr>
<td width="33%" valign="top">

### 01 · 얼굴
누가 와도 5초 만에
"이런 곳이구나"가
전해진다.

</td>
<td width="33%" valign="top">

### 02 · 연결
지금의 관심이
휘발되지 않고
다음 모집으로 이어진다.

</td>
<td width="33%" valign="top">

### 03 · 축적
프로젝트 · 사람 · 글이
기수를 넘어
계속 쌓인다.

</td>
</tr>
</table>

---

## 일하는 방식 — AI-native

**사람이 결정하고, AI가 구현합니다.** 그 원칙이 실제 작업 흐름으로 굴러갑니다.

```
PM이 미션 발행          무엇을 · 왜 · 완료 기준
   → 팀원이 수령         어떻게는 팀원이 정한다
      → R → P → I → Q    리서치 · 설계 · 구현 · QA
         → PR → 머지
```

PM은 두 게이트(설계 승인 · 최종 검수)에서만 개입하고, 그 사이는 팀원과 AI가 자율로 돕니다.
그래서 8명이 훨씬 큰 팀의 속도로 만듭니다.

---

## 팀

| 역할 | 멤버 |
|:--|:--|
| **PM** | 김우진 |
| **디자인** | 김영웅 · 유한솔 |
| **프론트엔드** | 박일하 · 김현정 |
| **백엔드** | 신선우 · 안시현 |
| **인프라** | 장찬욱 |

---

## 아키텍처

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Oracle Cloud](https://img.shields.io/badge/OCI-F80000?style=flat-square&logo=oracle&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare_R2-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI/CD-2088FF?style=flat-square&logo=githubactions&logoColor=white)

</div>

<br/>

모노레포 하나에 전부 들어 있습니다.

```
frontend/    화면            Next.js
backend/     API · 데이터     Spring Boot · SQLite
infra/       배포 · 운영      OCI · Docker · nginx
shared/      API 계약         프론트 ↔ 백엔드 단일 진실
pm/          기획 · 운영
```

<br/>

<div align="center">
<sub>© 멋쟁이사자처럼 경희대 · Built to last, not to reset.</sub>
</div>
