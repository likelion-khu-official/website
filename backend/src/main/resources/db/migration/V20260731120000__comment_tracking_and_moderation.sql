alter table comments add column anonymous_actor_id varchar(64);
alter table comments add column ip_hash varchar(64);
alter table comments add column user_agent varchar(100);
alter table comments add column hidden_at varchar(255);
alter table comments add column hidden_by_admin_id bigint;
alter table comments add column hidden_reason varchar(300);

create index idx_comments_anonymous_actor_id on comments (anonymous_actor_id);
create index idx_comments_ip_hash on comments (ip_hash);

create table comment_moderation_events (
    id integer,
    comment_id integer not null,
    action varchar(20) not null,
    admin_id bigint not null,
    reason varchar(300),
    created_at varchar(255) not null,
    primary key (id),
    foreign key (comment_id) references comments (id) on delete cascade
);

create index idx_comment_moderation_events_comment_id
    on comment_moderation_events (comment_id);
