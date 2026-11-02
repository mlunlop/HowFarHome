-- Aportaciones sin iniciar sesión: carteles nuevos ('add') y correcciones de posición ('move').
-- Ejecuta este archivo en el SQL Editor de Supabase (después de schema.sql).
create table if not exists public.sign_reports (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('add', 'move')),
  municipality_key text not null check (length(municipality_key) < 120),
  -- Cartel corregido; en los carteles nuevos va vacío.
  sign_key text check (length(sign_key) < 40),
  -- Solo España, Canarias incluida.
  lat double precision not null check (lat between 27 and 44.5),
  lng double precision not null check (lng between -18.5 and 4.6),
  note text check (length(note) <= 120),
  -- Identificador anónimo y aleatorio del navegador, solo para limitar abusos. No se publica.
  client_id uuid not null,
  created_at timestamptz not null default now(),
  check (kind = 'add' or sign_key is not null)
);

create index if not exists sign_reports_municipality_idx on public.sign_reports (municipality_key);
create index if not exists sign_reports_client_idx on public.sign_reports (client_id, created_at);

alter table public.sign_reports enable row level security;

drop policy if exists "reports are public" on public.sign_reports;
create policy "reports are public" on public.sign_reports
  for select to anon using (true);

drop policy if exists "anyone can report" on public.sign_reports;
create policy "anyone can report" on public.sign_reports
  for insert to anon with check (true);

-- Se puede leer todo menos client_id, y escribir solo los campos de la aportación.
revoke all on public.sign_reports from anon;
grant select (id, kind, municipality_key, sign_key, lat, lng, note, created_at) on public.sign_reports to anon;
grant insert (kind, municipality_key, sign_key, lat, lng, note, client_id) on public.sign_reports to anon;

-- Topes: 10 aportaciones por navegador y hora, y 60 por minuto en total.
-- security definer porque anon no puede leer client_id para contar.
create or replace function public.limit_sign_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from sign_reports
      where client_id = new.client_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many reports from this browser' using errcode = 'P0001';
  end if;
  if (select count(*) from sign_reports where created_at > now() - interval '1 minute') >= 60 then
    raise exception 'too many reports' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_sign_reports on public.sign_reports;
create trigger limit_sign_reports
  before insert on public.sign_reports
  for each row execute function public.limit_sign_reports();
