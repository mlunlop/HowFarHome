import { beforeEach, describe, expect, it, vi } from 'vitest'

//Supabase simulado: se comprueba qué se envía y cómo se reacciona a sus errores
const calls = []
let failures = []
vi.mock('./supabase.js', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    isShared: true,
    readJson: () => ({}),
    writeJson: () => {},
    clientId: () => '00000000-0000-4000-8000-000000000000',
    supabase: vi.fn(async (path, init) => {
      calls.push({ path, body: init?.body && JSON.parse(init.body) })
      const code = failures.shift()
      if (code) throw new original.SupabaseError(400, { code })
      return { json: async () => [] }
    }),
  }
})

const { castVote, verdict } = await import('./votes.js')

beforeEach(() => {
  calls.length = 0
  failures = []
})

describe('verdict', () => {
  it('decide por mayoría', () => {
    expect(verdict(undefined)).toBe('unverified')
    expect(verdict({ yes: 1, no: 1 })).toBe('unverified')
    expect(verdict({ yes: 2, no: 1 })).toBe('confirmed')
    expect(verdict({ yes: 0, no: 1 })).toBe('rejected')
  })
})

describe('castVote', () => {
  it('envía el voto con su origen, puntuación e id del navegador', async () => {
    await castVote('m', 'k', 1, { source: 'photo', score: 4 })
    expect(calls).toHaveLength(1)
    expect(calls[0].body).toMatchObject({ municipality_key: 'm', sign_key: 'k', vote: 1, source: 'photo', score: 4, client_id: expect.any(String) })
  })

  it('sin las migraciones opcionales, guarda el voto básico', async () => {
    failures = ['PGRST204', '23514']
    await castVote('m', 'k', -1, { source: 'photo', score: 4 })
    expect(calls).toHaveLength(3)
    expect(calls[1].body).toEqual({ municipality_key: 'm', sign_key: 'k', vote: -1, source: 'photo', score: 4 })
    expect(calls[2].body).toEqual({ municipality_key: 'm', sign_key: 'k', vote: -1 })
  })

  it('sin la 005 conserva el origen y la puntuación', async () => {
    failures = ['PGRST204']
    await castVote('m', 'k', 1, { source: 'destination', score: 2 })
    expect(calls).toHaveLength(2)
    expect(calls[1].body).toEqual({ municipality_key: 'm', sign_key: 'k', vote: 1, source: 'destination', score: 2 })
  })

  it('otros errores no se reintentan', async () => {
    failures = ['42501']
    await expect(castVote('m', 'k', 1)).rejects.toMatchObject({ code: '42501' })
    expect(calls).toHaveLength(1)
  })

  it('un voto repetido desde el mismo navegador no es un error', async () => {
    failures = ['23505']
    await expect(castVote('m', 'k', 1)).resolves.toBeUndefined()
    expect(calls).toHaveLength(1)
  })

  it('el exceso de votos se propaga como error', async () => {
    failures = ['P0001']
    await expect(castVote('m', 'k', 1)).rejects.toMatchObject({ rateLimited: true })
  })
})
