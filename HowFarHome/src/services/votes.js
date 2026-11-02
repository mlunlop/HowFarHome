// Votos «sí hay cartel / no hay cartel».
import { isShared, readJson, supabase, writeJson } from './supabase.js'

const TABLE = 'sign_votes'
const LOCAL_VOTES = 'howfarhome:votes'
const MY_VOTES = 'howfarhome:my-votes'

export const votesAreShared = isShared

// Recuento por cartel: { [signKey]: { yes, no } }
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

export async function castVote(municipalityKey, key, vote) {
  const row = { municipality_key: municipalityKey, sign_key: key, vote }

  if (isShared) {
    await supabase(TABLE, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    })
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
