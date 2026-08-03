-- #152: 지원폼 — 현재 활성 폼 정의(싱글턴) + 제출된 지원서.
-- 순수 추가 마이그레이션(기존 테이블 변경 없음). 질문 정의·답변은 FE가 정한 JSON을 파싱 없이
-- TEXT로 통째 저장한다. 제출 시점의 폼 정의를 답변과 함께 스냅샷으로 박아 둔다.

-- 폼 정의는 사이트에 하나뿐이라 RecruitmentStatus처럼 싱글턴 행(id 고정) — id는 @GeneratedValue가
-- 아니라 애플리케이션이 고정하므로 recruitment_status와 같은 bigint.
create table application_form (
    id bigint not null,
    schema_json TEXT not null,
    updated_at varchar(255),
    updated_by varchar(255),
    primary key (id)
);

-- 제출된 지원서. id는 @GeneratedValue(IDENTITY)라 SQLite rowid 별칭 규칙에 맞춰 integer
-- (notification_subscriptions·members 등과 동일 패턴).
create table applications (
    id integer,
    schema_snapshot_json TEXT not null,
    answers_json TEXT not null,
    submitted_at varchar(255) not null,
    primary key (id)
);
