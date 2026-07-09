> 🔗 이슈: https://github.com/likelion-khu-official/website/issues/95
> ⚙️ 필드: 제목 `[FE] 글쓰기 화면 — 링크 없이 바로 쓰고, 멤버 명단에서 본인 고르기 (~7/18)` · 어사인 김현정(@hjdd0309)·박일하(@ParkIlha) · 요청자 김우진 · 라벨 roadmap, 프론트 · 시작일 2026-07-10 · 목표일 2026-07-18(토)
> 아래가 이슈 본문입니다.

---

> 먼저 — **방금 글쓰기 화면(#78, #89) 다 만들었는데 토큰 분기를 다시 걷어내게 해서 미안해요.** 🙏
> 매직링크가 틀린 게 아니라, 팀 논의에서 "부원이 번거로우면 글을 안 쓴다"가 크게 나와서 더 가벼운 방식으로 방향을 틀었어요. 헛수고 아니에요 — **목록·상세·댓글·이미지 업로드·임시저장·미리보기는 그대로 살아요.** 걷어내는 건 토큰 관련 부분뿐이에요.
>
> 배경·왜 이 방식인지: PR #93 (`pm/docs/feed-write-policy.md`)에 대안 검토까지 다 있어요.

이 이슈는 **그대로 Claude Code에 붙여 실행**할 수 있게 썼어요. 저장소 안에서 `pm/docs/feed-write-policy.md`랑 `pm/onboarding/dev-monorepo-ai.md` 먼저 읽고 시작하면 돼요.

---

## 제품 관점 — 글쓰기가 이렇게 바뀌어요

**지금(매직링크):** `/blog/write`가 토큰 있어야 열림. 토큰 상태 따라 화면 5개(확인중·링크없음·만료·사용됨·에러).
**바뀌면:** 링크 없이 그냥 열림 → **멤버 명단에서 본인 고름**(이름·파트 자동) → 제목·본문 쓰고 제출 → "검수 후 올라가요" 안내.

---

## 무엇을 하나요 (변경 스펙)

> **선행:** 백엔드 미션이 `shared/types/feed.ts`(새 `PostCreateRequest`)를 머지한 뒤, 그리고 멤버 목록 API(`GET /api/members`, #76)가 나온 뒤 착수해요. 아래 "딸린 조건" 참고.

### 1. `src/components/blog/WriteForm.tsx` (핵심 개편)
- `TokenState` 타입, `getTokenStatus` 호출, 토큰 5개 분기 화면(`checking`/`no-token`/`expired`/`used`/`error`) **전부 삭제.**
- `props`에서 `token` 제거. 컴포넌트는 인자 없이 동작.
- **멤버 드롭다운 추가:** 마운트 시 `getMembers()`로 멤버 목록 불러와 select로. 본인 선택 시 그 멤버의 `name`·`part`(또는 role)를 폼 상태(`authorName`/`authorPart`)에 담기.
- 제출 시 `createPost({ authorName, authorPart, title, content, thumbnailUrl })` — 선택 안 하면 제출 막기.
- 임시저장(localStorage) 키를 `feed-draft:<token>` → **토큰 없는 고정 키**(예: `feed-draft`)로.
- 성공 화면 문구: "글이 등록됐어요 — **운영진 검수 후 올라가요**" (1회용 링크 문구 삭제).

### 2. `src/app/blog/write/page.tsx`
- `searchParams`의 `token` 제거. `<WriteForm />` 무인자로.

### 3. `src/lib/feedApi.ts`
- `createPost`: `headers`에서 `'X-Magic-Token'` **제거.** 시그니처를 `createPost(body: PostCreateRequest)`로(토큰 인자 삭제).
- `getTokenStatus` 함수 삭제 + `MagicLinkTokenStatusResponse` import 삭제.
- `getMembers()` 추가 — `GET /api/members` 호출(멤버 API #76 계약 `shared/types/member.ts` 사용). 서버/클라 baseUrl 패턴은 기존 `getPosts` 방식 그대로.

---

## 왜 하나요
매직링크 없애는 정책이라(백엔드 미션이랑 한 세트). 링크 받는 번거로움 없애고, 이름은 타이핑 대신 **명단에서 골라서** 오타·엉뚱한 사람 없이 깔끔하게. 대안 검토 근거는 PR #93.

## 다 됐다는 기준
- [ ] `/blog/write`가 URL 토큰 없이 정상 진입(토큰 안내 화면 0개)
- [ ] 멤버 드롭다운에서 본인 선택 필수, 미선택 시 제출 차단
- [ ] 제출이 선택 멤버의 `authorName`·`authorPart` 포함 본문으로 `POST /api/posts`(헤더 없음)
- [ ] 성공 시 "검수 후 게시" 안내
- [ ] `MagicLink`·`getTokenStatus` 참조 0건, `tsc`+`lint` 통과

## 경계 / 알아둘 것
- 목록·상세·댓글 페이지는 **손대지 않음.** 이미지 업로드·미리보기도 그대로.
- 어드민 검수 화면은 **이 미션 밖**(어드민 로그인 #74 후 별도 미션).
- 봇 가드 없음.

## 딸린 조건 (착수 전 확인)
- **`shared/types/feed.ts` 새 계약**이 머지돼 있어야 함(백엔드 미션 산출물).
- **`GET /api/members`(#76)가 나와야** 드롭다운을 채워요. 아직 미구현이면 이 미션은 대기. 고를 명단도 멤버 몇 명 미리 넣어둬야(수동 시드) 실제로 동작해요 — 안 되면 PM(@xhae123)에 말해주세요.
