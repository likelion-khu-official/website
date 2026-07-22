# 결과 — #83 인프라 · 조용한 실패를 먼저 알아채기 — 관측·알림 기반

> 미션이 닫힐 때 채운다. 재사용할 통찰은 pm/docs/learnings.md로 졸업.

## 산출물
- **PR #86** (MERGED 07-12) — 본체. 외부 감시(UptimeRobot 모니터 4개: 백엔드 prod/stage 헬스체크 + 프론트 prod/dev, 5분 간격) + OCI Monitoring Alarm 4개(디스크 80%·메모리 85%·백업 부재 26h × prod/stage) + ONS 이메일 구독 + IAM Dynamic Group/Policy(instance principal). 레포 diff: `infra/push-disk-metric.py`·`infra/push-backup-metric.py`(신규), `infra/backup-db.sh` 훅 1줄, `infra/.gitattributes`(신규, `*.sh`/`*.py` LF 고정). 문서: `infra/uptime-monitoring.md`(①②)·`infra/observability.md`(③④). 클라우드 리소스는 콘솔/CLI로 직접 생성 — 문서가 유일한 재현 기록.
- **PR #104** (MERGED) — #83 브랜치를 통째로 머지하지 않고, 서버에 이미 운영 중이던 백업 성공 메트릭 전송 호출 3줄과 `.gitattributes`만 cherry-pick해 서버 실제 상태와 git을 일치시킴(알람이 계속 돌게).
- **PR #112** (MERGED 07-14) — 후속 수정. `backup-db.sh` 실행권한(755)을 git에 커밋. 07-13 PR #110 재체크아웃으로 파일 모드가 644로 되돌아가 백업이 조용히 실패 → **이 미션의 백업 부재 알람이 실제로 잡아냄**.
- **미션 완료도: 전량 완료(부분완료 아님).** 이슈는 목표일 7/30보다 이른 07-14에 담당(장찬욱)이 Done 5개 항목을 전부 실측 근거로 충족 확인하며 닫음 — 조기 종료는 미완이 아니라 알람이 실전 장애를 두 번(07-08 CRLF, 07-13 exec bit) 잡아내며 신뢰도가 재확인됐기 때문.
- **명시적으로 남긴 한계(별도 이슈화는 보류):** ① 프론트 다운 감지는 PR #86 머지 시점엔 미검증이었으나 이후 07-12~13 실제 다운 이벤트(dev/prod)로 UptimeRobot 정상 감지·알림 확인됨. ② UptimeRobot 무료 플랜 5분 체크 틈새 — 그보다 짧게 끝나는 장애는 구조적으로 놓칠 수 있음(문서화된 채 수용). ③ ONS 알람 구독자가 개인 이메일 2명(장찬욱·김우진)뿐, 공용 메일함 아님 — 인원 의존 리스크. ④ 백업 부재 알람의 "26시간" 문서값은 내부 타이밍으로 실측 검증되진 않음(FIRING/OK 전환 자체는 확인됨).

## 결정
- 유료 관측 서비스 없이 무료 범위(UptimeRobot 무료 + OCI Monitoring/Notifications, 실제 청구액 0원 확인)로 해결 — 미션 제약("가볍게, 딱 필요한 만큼", 유료 금지) 준수.
- 5분 체크 틈새로 짧은 장애를 놓치는 구조적 한계는 무료 플랜 대가로 감내하기로 수용(별도 이슈화 안 함).

## 배운 것
- (없음 — CRLF·exec bit 배포 드리프트로 인한 백업의 조용한 실패, 관측·백업 검증 통찰은 이미 learnings.md에 있음)
