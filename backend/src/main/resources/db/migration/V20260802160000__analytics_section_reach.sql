create table analytics_events (
    id integer,
    event_type varchar(32) not null,
    event_key varchar(64) not null,
    visitor_key varchar(64),
    visit_key varchar(64) not null,
    deduplication_key varchar(64) unique,
    occurred_at varchar(255) not null,
    primary key (id)
);

create index idx_analytics_events_type_occurred_at
    on analytics_events (event_type, occurred_at);
