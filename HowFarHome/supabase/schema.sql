-- Ejecuta esto en el SQL Editor de tu proyecto de Supabase.
create table if not exists public.sign_votes (
  id bigint generated always as identity primary key,
  municipality_key text not null check (length(municipality_key) < 120),
  sign_key text not null check (length(sign_key) < 40),
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now()
);

create index if not exists sign_votes_municipality_idx on public.sign_votes (municipality_key);

-- Cualquiera puede leer y añadir votos, pero nadie puede editarlos ni borrarlos.
alter table public.sign_votes enable row level security;

drop policy if exists "votes are public" on public.sign_votes;
create policy "votes are public" on public.sign_votes
  for select to anon using (true);

drop policy if exists "anyone can vote" on public.sign_votes;
create policy "anyone can vote" on public.sign_votes
  for insert to anon with check (true);
