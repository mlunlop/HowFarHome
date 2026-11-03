-- Guarda con cada voto de dónde salió el candidato y su puntuación, para medir la precisión.
-- Ejecuta este archivo en el SQL Editor de Supabase (después de 002_sign_reports.sql).
alter table public.sign_votes
  add column if not exists source text check (source in ('destination', 'road-name', 'user')),
  add column if not exists score smallint check (score between -10 and 10);

-- Precisión por tipo de indicio y por puntuación: qué parte de los votos dice que el cartel existe.
-- Consúltala en el SQL Editor con: select * from public.sign_vote_precision;
create or replace view public.sign_vote_precision
with (security_invoker = true) as
select
  coalesce(source, 'sin dato') as source,
  score,
  count(*) filter (where vote > 0) as votos_si,
  count(*) filter (where vote < 0) as votos_no,
  round(100.0 * count(*) filter (where vote > 0) / count(*), 1) as precision_pct
from public.sign_votes
group by 1, 2
order by 1, 2 desc;

-- Es una herramienta para ti, no para la app.
revoke all on public.sign_vote_precision from anon, authenticated;
