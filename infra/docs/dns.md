# DNS 레코드가 하는 일 — 요청 흐름 계층별로 왜 이렇게 세팅했나

> 인프라 문서. `infra/CLAUDE.md`의 "아키텍처" 절에 있는 DNS 레코드 목록이 실제로 어떤 요청 흐름에서 쓰이는지 계층별로 설명한다.

DNS 레코드는 그냥 "이 이름이 이 IP다"가 아니라, 아키텍처의 각 요청 흐름에서 **정확히 어느 지점을 담당하는지**가 따로 있다. 레코드 하나를 지우거나 헷갈리면 어느 계층이 끊기는지 알아야 실수를 안 한다.

**① 사용자 브라우저 → 프론트엔드(Vercel)** — 방문자가 실제로 보는 유일한 도메인
```
브라우저 → likelion-khu.com / www.likelion-khu.com (A·CNAME → Vercel) → Next.js 앱
```
- `likelion-khu.com`(A)·`www.likelion-khu.com`(CNAME): 둘 다 Vercel — 브라우저 주소창에 찍히는 진짜 진입점. **브라우저는 이 도메인 하나로만 요청하고 `api.*` 도메인은 절대 직접 안 부른다**(②에서 이유가 나온다).
- `dev.likelion-khu.com`(프론트 스테이징): 같은 계층이지만 dev 환경 — Vercel이 별도 배포로 서빙하며, 이 서버의 nginx·인증서와는 완전히 무관하다.

**② 프론트 서버(Next.js, Vercel) → 백엔드 API(OCI)** — 브라우저가 아니라 서버끼리 통신하는 내부 경로
```
Next.js 서버사이드 rewrite(`BACKEND_URL` 환경변수, 서버 전용)
  → api.prod.likelion-khu.com / api.stage.likelion-khu.com (A → 168.138.202.82, 이 OCI 인스턴스)
  → nginx가 Host 헤더(server_name)로 prod/stage를 구분해 backend-prod:8080 / backend-stage:8080으로 라우팅
```
- `api.prod.likelion-khu.com`·`api.stage.likelion-khu.com`(A): **둘 다 같은 OCI 인스턴스의 같은 IP**를 가리킨다 — 서버가 두 대라서가 아니라, nginx 하나가 도메인(Host 헤더)만으로 prod/stage를 갈라 서로 다른 컨테이너로 보낸다. 이 도메인 두 개가 없으면 nginx가 "이 요청이 prod용인지 stage용인지" 구분할 방법이 없다.
- 이 요청은 **브라우저가 직접 하는 게 아니라 Next.js 서버(Vercel)가 서버사이드로 대신 호출**한다 — 그래서 브라우저 개발자도구를 열어도 백엔드 주소가 안 보이고 CORS 설정도 불필요하다(브라우저 입장에선 계속 `likelion-khu.com` 하나의 오리진으로만 요청하는 것으로 보임). `api.*` 도메인이 존재하는 이유는 사람이 브라우저로 찾아가라고가 아니라, **nginx가 라우팅 근거로 쓰고 Let's Encrypt 인증서가 이 이름들로 발급돼 있어 HTTPS가 성립**하기 때문이다.

**③ 이메일 발신 계층(OCI Email Delivery)** — "진짜 우리가 보낸 메일"임을 증명하는 계층
```
백엔드(Spring Boot) --SMTP--> OCI Email Delivery 릴레이 --실제 발송--> 수신자 메일서버
                                                              ↑
                                          SPF/DKIM/DMARC로 발신 신뢰성을 검증
```
- `likelion-khu.com`(TXT, SPF): 수신 서버가 "지금 접속한 IP가 이 도메인이 허가한 발신 IP 대역(OCI)에 있나"만 대조하는 레코드 — 없으면 스팸함행 확률이 크게 올라간다(`email-delivery.md`).
- `mail-tokyo-*._domainkey`(CNAME, DKIM): OCI가 서명한 메일의 공개키를 수신 서버가 실시간으로 조회하게 Oracle 존으로 위임하는 레코드 — 공개키 값 자체는 안 담고 있어서 OCI가 키를 로테이션해도 이 레코드는 안 건드려도 된다.
- `_dmarc`(TXT): SPF·DKIM 결과가 서로 안 맞을 때(정렬 실패) 뭘 할지(`p=none`=관찰만, 거부/격리 아님)와 실패 리포트를 어디로 보낼지 정의.
- **MX 레코드는 아예 없다** — 이 도메인은 메일을 "받는" 인프라가 전혀 없고 "보내기"만 한다는 뜻(발신 전용, `email-delivery.md`). `likelion-khu.com`으로 온 메일에 답장한다는 개념 자체가 없다.

**④ 인증서 발급 계층**
- CAA 레코드 없음 — "이 도메인 인증서는 반드시 특정 CA(Let's Encrypt 등)에서만 발급 가능"처럼 발급 기관을 제한하는 장치가 없다는 뜻. 지금은 위험도가 낮다고 판단해 안 걸어뒀지만, 강화하려면 CAA로 Let's Encrypt만 허용하도록 추가할 수 있다.

**한눈에 요약**: 방문자가 실제로 접속하는 도메인(`likelion-khu.com`/`www`/`dev`, ①)과, 백엔드가 서버간 통신·nginx 라우팅에만 쓰는 내부용 도메인(`api.prod`/`api.stage`, ②)과, 이메일이 "진짜 우리가 보낸 것"이라고 증명하는 레코드(SPF/DKIM/DMARC, ③)는 **같은 존(zone) 안에 있지만 목적이 완전히 다르다.** 이 구분을 알아야 "`api.*` 레코드를 왜 지우면 안 되는지"(브라우저는 안 써도 서버간 통신과 nginx 라우팅이 이걸로 돈다)나 "왜 MX가 없어도 되는지"(원래 수신용 도메인이 아니었다) 같은 질문에 근거를 갖고 답할 수 있다.
