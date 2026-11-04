import { describe, expect, it } from 'vitest'
import { extractSigns, nameVariants, normalizeName, pickCandidates, plausibleRangeKm, signKey, textMentions } from './signs.js'

const HOME = { name: 'Sant Vicenç dels Horts', lat: 41.392, lng: 2.009, population: 28000 }

const destination = (id, lat, lon, text, extra = {}) => ({
  type: 'node',
  id,
  lat,
  lon,
  tags: { highway: 'motorway_link', destination: text, ...extra },
})

describe('normalizeName / nameVariants / signKey', () => {
  it('quita tildes, mayúsculas y espacios', () => {
    expect(normalizeName('  Sant  VICENÇ dels Horts ')).toBe('sant vicenc dels horts')
  })
  it('separa los nombres bilingües', () => {
    expect(nameVariants('Donostia / San Sebastián')).toEqual(['Donostia', 'San Sebastián'])
  })
  it('redondea la clave a 4 decimales', () => {
    expect(signKey({ lat: 41.123456, lng: -2.987654 })).toBe('41.1235,-2.9877')
  })
})

describe('plausibleRangeKm', () => {
  it('usa la población si la hay', () => {
    expect(plausibleRangeKm({ population: 500 })).toBe(40)
    expect(plausibleRangeKm({ population: 2_000_000 })).toBe(Infinity)
  })
  it('usa el tipo de núcleo y si no, el valor por defecto', () => {
    expect(plausibleRangeKm({ placeType: 'hamlet' })).toBe(40)
    expect(plausibleRangeKm({})).toBe(150)
  })
})

describe('textMentions (OCR)', () => {
  it('encuentra el nombre exacto entre líneas y referencias', () => {
    expect(textMentions('PEAL | 25 | DE | BECERRO', 'Peal de Becerro')).toBe(true)
  })
  it('admite un error de OCR en nombres largos', () => {
    expect(textMentions('VILLANUEVA DEL ARZOBISP0', 'Villanueva del Arzobispo')).toBe(true)
  })
  it('los nombres cortos tienen que leerse exactos', () => {
    expect(textMentions('CENTRO', 'Cenero')).toBe(false)
  })
  it('acepta abreviaturas con punto', () => {
    expect(textMentions('ST. VICENC | DELS H.', 'Sant Vicenç dels Horts')).toBe(true)
  })
  it('rechaza abreviaturas sin ninguna palabra completa larga', () => {
    expect(textMentions('ST. C.', 'Sant Cugat')).toBe(false)
  })
  it('ignora el nombre de una sierra', () => {
    expect(textMentions('P.N. SIERRAS DE CAZORLA', 'Cazorla')).toBe(false)
  })
})

describe('extractSigns', () => {
  it('reconoce destinos completos y abreviados, y descarta los que solo contienen el nombre', () => {
    const elements = [
      destination(1, 41.5, 2.2, 'Sant Vicenç dels Horts'),
      destination(2, 41.6, 2.3, 'St. Vicenç dels H.;Barcelona'),
      destination(3, 41.7, 2.4, 'Parque de Sant Vicenç dels Horts'),
    ]
    const signs = extractSigns(elements, HOME)
    expect(signs.map((s) => s.osmUrl)).toEqual([
      'https://www.openstreetmap.org/node/2',
      'https://www.openstreetmap.org/node/1',
    ])
    //Del más lejano al más cercano
    expect(signs[0].distanceKm).toBeGreaterThan(signs[1].distanceKm)
  })

  it('no devuelve nada sin elementos (búsqueda vacía)', () => {
    expect(extractSigns([], HOME)).toEqual([])
  })

  it('ignora carteles más cerca de un pueblo homónimo', () => {
    const elements = [
      destination(1, 40.0, -3.7, 'Sant Vicenç dels Horts'),
      { type: 'node', id: 9, lat: 40.01, lon: -3.7, tags: { place: 'village', name: 'Sant Vicenç dels Horts' } },
    ]
    expect(extractSigns(elements, HOME)).toEqual([])
  })

  it('no confunde un sendero ni un panel informativo con un cartel', () => {
    const elements = [
      destination(1, 41.5, 2.2, 'Sant Vicenç dels Horts', { highway: 'footway' }),
      destination(2, 41.6, 2.2, 'Sant Vicenç dels Horts', { highway: undefined, tourism: 'information' }),
    ]
    expect(extractSigns(elements, HOME)).toEqual([])
  })

  it('lee las fotos con OCR y descarta paneles de obras', () => {
    const elements = [
      { type: 'photo', id: 'p1', lat: 41.45, lon: 2.1, tags: { ocr: 'SANT VICENÇ | DELS HORTS', image: '123' } },
      { type: 'photo', id: 'p2', lat: 41.55, lon: 2.1, tags: { ocr: 'UNION EUROPEA | SANT VICENÇ DELS HORTS', image: '456' } },
    ]
    const signs = extractSigns(elements, HOME)
    expect(signs).toHaveLength(1)
    expect(signs[0]).toMatchObject({ source: 'photo', imageId: '123', confidence: 'alta' })
  })
})

describe('pickCandidates', () => {
  it('salta los carteles del mismo cruce', () => {
    const signs = [
      { key: 'a', lat: 42, lng: 2, distanceKm: 70, source: 'destination' },
      { key: 'b', lat: 42.001, lng: 2, distanceKm: 69.9, source: 'destination' },
      { key: 'c', lat: 41.8, lng: 2, distanceKm: 45, source: 'destination' },
    ]
    expect(pickCandidates(signs).map((s) => s.key)).toEqual(['a', 'c'])
  })
  it('no falla con la lista vacía', () => {
    expect(pickCandidates([])).toEqual([])
  })
})
