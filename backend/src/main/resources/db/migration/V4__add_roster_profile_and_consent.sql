-- 공개 명단에 필요한 프로필 원본과 게시 동의 증적을 DB에 보관한다.
-- 기존 행은 명시적으로 다시 동의 처리하기 전까지 공개되지 않도록 false가 기본값이다.

alter table members add column department varchar(255);
alter table members add column publication_consent boolean not null default false;
alter table members add column publication_consented_at varchar(255);

alter table staff add column student_id varchar(255);
alter table staff add column phone varchar(255);
alter table staff add column publication_consent boolean not null default false;
alter table staff add column publication_consented_at varchar(255);
