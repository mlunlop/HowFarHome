--Topes a los votos, como los de sign_reports: sin esto cualquiera puede lanzar miles de votos
--con la clave pública y descartar todos los carteles de un pueblo
--Va después de 004_photo_votes.sql
alter table public.sign_votes
  add column if not exists client_id uuid;

create index if not exists sign_votes_client_idx on public.sign_votes (client_id, created_at);

--Un voto por navegador y cartel (los votos antiguos, sin client_id, no cuentan)
create unique index if not exists sign_votes_one_per_client
  on public.sign_votes (client_id, municipality_key, sign_key)
  where client_id is not null;

--Se puede leer todo menos client_id; al insertar no se elige ni el id ni la fecha
revoke all on public.sign_votes from anon;
grant select (id, municipality_key, sign_key, vote, source, score, created_at) on public.sign_votes to anon;
grant insert (municipality_key, sign_key, vote, source, score, client_id) on public.sign_votes to anon;

--30 votos por navegador y hora, y 120 por minuto en total
--Los votos sin client_id (versiones antiguas de la web) solo cuentan para el tope global
create or replace function public.limit_sign_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.client_id is not null and (select count(*) from sign_votes
      where client_id = new.client_id and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'too many votes from this browser' using errcode = 'P0001';
  end if;
  if (select count(*) from sign_votes where created_at > now() - interval '1 minute') >= 120 then
    raise exception 'too many votes' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_sign_votes on public.sign_votes;
create trigger limit_sign_votes
  before insert on public.sign_votes
  for each row execute function public.limit_sign_votes();
