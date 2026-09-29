-- The game API stores each session as one JSON document (the domain SessionState).
-- The API is the only reader and writer, using the database connection string.
-- Browsers never talk to this table: RLS is on and there are no policies,
-- so the anon and authenticated roles (PostgREST) are denied.

create table if not exists session_documents (
  id uuid primary key,
  code text not null unique,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists session_documents_updated_at on session_documents (updated_at);

alter table session_documents enable row level security;
alter table session_documents force row level security;

revoke all on table session_documents from anon, authenticated;
