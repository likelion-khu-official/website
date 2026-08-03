# 프론트엔드 — 디자인 언어

> UI·스타일 작업 시작 전에 이 문서를 읽는다. **값의 진실은 코드, 픽셀의 진실은 Figma, "왜"의 진실은 이 문서.**
> 얇게 유지한다 — 값을 여기 베끼지 않는다(그럼 코드와 어긋난다). 규칙과 의도만 담는다.

## 토큰은 코드가 진실

색·폰트·모션 값의 SoT는 `src/app/globals.css`의 `@theme`(`--background`·`--foreground`·`--muted`·`--accent`·`--motion-ease-out`)다.

- **하드코딩 금지.** `#131313` 대신 `var(--background)`, 오렌지 대신 `var(--accent)`, 모션 곡선 대신 `var(--motion-ease-out)`을 쓴다.
- 새 토큰이 필요하면 `globals.css`에 추가하고 거기서 참조한다. 이 문서에 값을 적지 않는다.

## 비주얼 언어 (비자명한 것만)

- **다크 앰버.** 배경은 거의 검정(`--background`), 위에 **웜 오렌지 글로우**를 얹는 게 우리 정체성이다. 새 섹션 배경은 기존 `*-bg` 클래스(`recruit-bg`·`blog-bg`·`plan-bg` 등)의 radial-gradient 패턴을 따른다 — 처음부터 새로 만들지 않는다.
- **Accent(오렌지)는 아껴 쓴다.** CTA·focus outline·`::selection`·hover 강조에만. 넓은 면적 채우기 금지.
- **타이포는 스케일을 재사용한다.** 섹션 헤더는 `.landing-section-kicker` / `.landing-section-title` / `.landing-section-copy` 위계를 쓴다. 한글은 Pretendard, 라틴은 Inter로 자동 폴백(`--font-sans`).
- **모션은 한 곡선으로.** 진입·전환은 `--motion-ease-out`. 튀는 이징을 새로 만들지 않는다.
- **`prefers-reduced-motion`은 필수.** 애니메이션을 추가하면 reduce 분기에서 반드시 끈다(`globals.css` 하단 패턴 참고). 빠뜨리면 접근성 회귀다.

## 스켈레톤 / 로딩 상태

스켈레톤(`loading.tsx`·`animate-pulse`)은 **실제 화면의 자리표시자**다. 둘이 어긋나면 로딩→콘텐츠 전환에서 레이아웃이 튀어(layout shift) 사용자가 어색함을 느낀다.

- **뼈대를 실제와 맞춘다.** 컨테이너 폭·패딩·그리드·`border-radius`·카드 비율을 실제 컴포넌트와 **같은 값**으로 둔다. 실제 페이지가 바뀌면 스켈레톤도 같이 고친다(한 PR에서).
- 스켈레톤은 형태만 — 텍스트·색을 흉내 내지 말고 `bg-white/10` 계열 블록으로 둔다.
- 목표는 "예쁜 로딩"이 아니라 **전환 시 안 튀는 것**. 판단 기준은 로딩→실제 전환에서 요소가 제자리에 있는가다.

## Figma & do/don't

- **픽셀·간격의 최종 진실은 Figma.** 이 문서는 구현 규율이지 시안이 아니다. 값이 갈리면 Figma가 이긴다.
- **Do:** 기존 클래스·토큰·패턴 재사용 → 확인 후 없을 때만 새로.
- **Don't:** 색/모션 하드코딩, reduced-motion 누락, 스켈레톤과 실제 화면 불일치, accent 남용.
