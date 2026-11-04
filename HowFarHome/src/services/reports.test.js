import { describe, expect, it } from 'vitest'
import { addedSignKey, applyReports, osmEditUrl } from './reports.js'
import { signKey } from './signs.js'

const HOME = { lat: 40, lng: -3 }
const candidate = (lat, lng, distanceKm) => ({ key: signKey({ lat, lng }), lat, lng, distanceKm, source: 'destination' })

describe('applyReports', () => {
  it('sin aportaciones deja los candidatos igual', () => {
    const candidates = [candidate(41, -3, 111)]
    expect(applyReports(candidates, [], HOME)).toEqual(candidates)
  })

  it('añade los carteles nuevos y ordena por distancia', () => {
    const result = applyReports([candidate(40.5, -3, 55)], [{ kind: 'add', lat: 41, lng: -3, note: 'Salida 12' }], HOME)
    expect(result.map((s) => s.source)).toEqual(['user', 'destination'])
    expect(result[0]).toMatchObject({ key: signKey({ lat: 41, lng: -3 }), text: 'Salida 12' })
  })

  it('un añadido encima de un candidato existente no se duplica', () => {
    const result = applyReports([candidate(41, -3, 111)], [{ kind: 'add', lat: 41.0001, lng: -3 }], HOME)
    expect(result).toHaveLength(1)
  })

  it('dos añadidos en el mismo sitio cuentan como uno (claves únicas)', () => {
    const reports = [
      { kind: 'add', lat: 41, lng: -3 },
      { kind: 'add', lat: 41.00001, lng: -3 },
    ]
    const result = applyReports([], reports, HOME)
    expect(result).toHaveLength(1)
    expect(new Set(result.map((s) => s.key)).size).toBe(result.length)
  })

  it('mueve el cartel a la mediana de las correcciones y conserva la clave', () => {
    const sign = candidate(41, -3, 111)
    const reports = [
      { kind: 'move', sign_key: sign.key, lat: 41.01, lng: -3 },
      { kind: 'move', sign_key: sign.key, lat: 41.02, lng: -3 },
      { kind: 'move', sign_key: sign.key, lat: 49, lng: -3 }, //malintencionada
    ]
    const [moved] = applyReports([sign], reports, HOME)
    expect(moved.key).toBe(sign.key)
    expect(moved.lat).toBe(41.02)
    expect(moved.corrections).toBe(3)
  })

  it('las correcciones de un cartel inexistente no rompen nada', () => {
    expect(applyReports([], [{ kind: 'move', sign_key: 'x', lat: 41, lng: -3 }], HOME)).toEqual([])
  })
})

describe('addedSignKey', () => {
  it('devuelve la clave del candidato con el que se fundió el añadido', () => {
    const existing = candidate(41, -3, 111)
    const report = { kind: 'add', lat: 41.0001, lng: -3 }
    const merged = applyReports([existing], [report], HOME)
    expect(addedSignKey(merged, report)).toBe(existing.key)
  })
  it('devuelve su propia clave si es un cartel nuevo', () => {
    const report = { kind: 'add', lat: 42, lng: -3 }
    expect(addedSignKey(applyReports([], [report], HOME), report)).toBe(signKey(report))
  })
})

describe('osmEditUrl', () => {
  it('construye el enlace del editor iD', () => {
    expect(osmEditUrl({ lat: 40.1, lng: -3.2 })).toBe('https://www.openstreetmap.org/edit?editor=id#map=19/40.100000/-3.200000')
  })
})
