## 구현 현황

<pre>
🦁 <a href="pm/features/README.md">사이트</a>
│
├─ <a href="pm/features/공개-사이트.md">공개 사이트</a>  /
│  ├─ <a href="pm/features/랜딩.md">🟢 랜딩</a>
│  │   ├─ <a href="pm/features/랜딩-히어로소개통계세션.md">🟢 히어로 · 소개 · 통계 · 세션</a>
│  │   └─ <a href="pm/features/랜딩-연간활동계획.md">🟡 연간 활동계획</a>
│  ├─ <a href="pm/features/프로젝트-쇼케이스.md">🟡 프로젝트 쇼케이스</a>
│  │   ├─ <a href="pm/features/프로젝트-목록.md">🟡 목록  /projects</a>
│  │   └─ <a href="pm/features/프로젝트-상세.md">🟡 상세  /projects/:id</a>
│  ├─ <a href="pm/features/멤버-로스터.md">🟡 멤버 로스터</a>  /members
│  │   ├─ <a href="pm/features/멤버카드.md">🟢 멤버 카드</a>
│  │   └─ <a href="pm/features/로스터-탭.md">🟡 로스터 탭</a>
│  ├─ <a href="pm/features/운영진-소개.md">🟡 운영진 소개</a>
│  │   └─ <a href="pm/features/운영진-카드.md">🟡 운영진 카드</a>
│  ├─ <a href="pm/features/블로그.md">🟡 블로그</a>
│  │   ├─ <a href="pm/features/블로그-목록.md">🟢 목록  /blog</a>
│  │   ├─ <a href="pm/features/블로그-글상세.md">🟢 글 상세  /blog/:slug</a>
│  │   └─ <a href="pm/features/블로그-익명댓글.md">🟢 익명 댓글</a>
│  └─ <a href="pm/features/모집.md">모집</a>
│      ├─ <a href="pm/features/모집-알림.md">🟡 모집 알림 신청</a>
│      └─ <a href="pm/features/지원폼.md">⚪ 지원폼</a>
│          ├─ <a href="pm/features/지원폼-공통질문.md">⚪ 공통 질문</a>
│          ├─ <a href="pm/features/지원폼-세션별질문.md">⚪ 세션별 질문</a>
│          └─ <a href="pm/features/지원폼-개인정보동의.md">⚪ 개인정보 동의 · 접수</a>
│
├─ <a href="pm/features/계정-인증.md">인증 · 계정</a>
│  ├─ <a href="pm/features/로그인.md">🟡 로그인 (학번 + 비밀번호)</a>
│  ├─ <a href="pm/features/첫로그인-비번변경.md">🟡 첫 로그인 비밀번호 변경</a>
│  ├─ <a href="pm/features/비번-초기화.md">🟡 비밀번호 초기화</a>
│  └─ <a href="pm/features/역할-4종.md">🟡 역할 4종</a>
│
├─ <a href="pm/features/멤버-영역.md">멤버 영역</a>  /member
│  ├─ <a href="pm/features/글쓰기.md">🟡 글쓰기</a>
│  ├─ <a href="pm/features/내글-수정삭제.md">🟢 내 글 수정 · 삭제</a>
│  ├─ <a href="pm/features/내프로필-편집.md">🟡 내 프로필 편집</a>
│  └─ <a href="pm/features/내프로젝트.md">🟡 내 프로젝트</a>
│
├─ <a href="pm/features/어드민.md">어드민</a>  /admin
│  ├─ <a href="pm/features/멤버-관리.md">🔵 멤버 관리</a>
│  ├─ <a href="pm/features/운영진-소개-관리.md">🟡 운영진 소개 관리</a>
│  ├─ <a href="pm/features/모니터링-검수.md">🟡 모니터링 · 검수</a>
│  ├─ <a href="pm/features/명단-열람.md">🔵 명단 열람</a>
│  └─ <a href="pm/features/모집-관리.md">🟡 모집 관리</a>
│
└─ <a href="pm/features/최고관리자.md">최고관리자</a>
   ├─ <a href="pm/features/임명-회수.md">🟡 관리자 임명 · 회수</a>
   └─ <a href="pm/features/최고관리자-승계.md">🔵 최고관리자 승계</a>
</pre>

<sub>상태 · 🟢 완료 · 🟡 진행 중 · 🔵 계획 · ⚪ 미착수</sub>

각 노드를 클릭하면 해당 기능의 문서(개요·진행 상태)로 이동하며, 문서 상단 경로와 `하위` 목록으로 트리를 오르내릴 수 있습니다.
**기능의 정식 명세·정책은 [서비스 위키](https://github.com/likelion-khu-official/website/wiki)를 정본으로 합니다. 구현이나 논의에 앞서 반드시 위키를 먼저 확인해 주세요.**

> 💡 **기획에서 빠진 게 보이면 편하게 [이슈를 던지세요](https://github.com/likelion-khu-official/website/issues/new).** 트리에 없는 기능, ⚪ 미착수인데 지금 필요한 것, "이건 어떻게 동작해야 하지?" 싶은 애매한 지점 — 뭐든 좋아요. 완성된 제안이 아니어도 됩니다.

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
