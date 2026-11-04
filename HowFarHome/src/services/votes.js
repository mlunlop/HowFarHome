//Votos «sí hay cartel / no hay cartel»
import { isShared, readJson, supabase, writeJson } from './supabase.js'

const TABLE = 'sign_votes'
const LOCAL_VOTES = 'howfarhome:votes'
const MY_VOTES = 'howfarhome:my-votes'

export const votesAreShared = isShared

//Recuento por cartel: { [signKey]: { yes, no } }
export async function fetchVotes(municipalityKey, { signal } = {}) {
  let rows
  if (isShared) {
    const query = new URLSearchParams({
      select: 'sign_key,vote',
      municipality_key: `eq.${municipalityKey}`,
    })
    rows = await (await supabase(`${TABLE}?${query}`, { signal })).json()
  } else {
    rows = readJson(LOCAL_VOTES)[municipalityKey] ?? []
  }

  const tally = {}
  for (const { sign_key: key, vote } of rows) {
    tally[key] ??= { yes: 0, no: 0 }
    tally[key][vote > 0 ? 'yes' : 'no']++
  }
  return tally
}

export function myVote(municipalityKey, key) {
  return readJson(MY_VOTES)[`${municipalityKey}|${key}`] ?? null
}

//source y score permiten medir qué indicios aciertan (ver supabase/003_vote_sources.sql)
export async function castVote(municipalityKey, key, vote, { source = null, score = null } = {}) {
  const row = { municipality_key: municipalityKey, sign_key: key, vote }
  const insert = (body) =>
    supabase(TABLE, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    })

  if (isShared) {
    try {
      await insert({ ...row, source, score })
    } catch (error) {
      //Sin la migración 003 esas columnas no existen: el voto se guarda igualmente
      if (error.code !== 'PGRST204') throw error
      await insert(row)
    }
  } else {
    const local = readJson(LOCAL_VOTES)
    local[municipalityKey] = [...(local[municipalityKey] ?? []), row]
    writeJson(LOCAL_VOTES, local)
  }

  writeJson(MY_VOTES, { ...readJson(MY_VOTES), [`${municipalityKey}|${key}`]: vote })
}

export function verdict(tally) {
  if (!tally) return 'unverified'
  if (tally.no > tally.yes) return 'rejected'
  if (tally.yes > tally.no) return 'confirmed'
  return 'unverified'
}
