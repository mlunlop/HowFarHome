--Admite votos a carteles leídos en fotos de Mapillary (source = 'photo')
--Va después de 003_vote_sources.sql
alter table public.sign_votes drop constraint if exists sign_votes_source_check;
alter table public.sign_votes
  add constraint sign_votes_source_check check (source in ('destination', 'road-name', 'user', 'photo'));
