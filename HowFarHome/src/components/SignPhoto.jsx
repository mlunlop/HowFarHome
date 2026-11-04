import { useEffect, useState } from 'react'

//Fotos reales de Mapillary (CC BY-SA 4.0) de carteles que salen en los resultados (3 nov 2026)
//Cada una muestra un cartel concreto y su distancia; al pulsar se busca el más lejano
//focus: la parte de la foto donde está el cartel, para que el recorte no lo corte
const PHOTOS = [
  {
    file: 'madrid',
    km: 502,
    where: 'En la A-6, A Coruña',
    focus: '88% 58%',
    author: 'iago',
    imageId: '534170937962831',
    place: { name: 'Madrid', region: 'Comunidad de Madrid', lat: 40.416782, lng: -3.703507 },
  },
  {
    file: 'valencia',
    km: 302,
    where: 'En la A-3, Madrid',
    focus: '25% 35%',
    author: 'msevilla00',
    imageId: '938242003685177',
    place: { name: 'Valencia', region: 'Valencia', lat: 39.4697065, lng: -0.3763353 },
  },
  {
    file: 'zaragoza',
    km: 265,
    where: 'En la M-40, Madrid',
    focus: '60% 30%',
    author: 'seraq',
    imageId: '1209884594016918',
    place: { name: 'Zaragoza', region: 'Zaragoza', lat: 41.6915847, lng: -0.9101268 },
  },
  {
    file: 'burgos',
    km: 210,
    where: 'En la M-50, cerca de Madrid',
    focus: '55% 40%',
    author: 'm_esp_32',
    imageId: '977200608739263',
    place: { name: 'Burgos', region: 'Burgos', lat: 42.3439925, lng: -3.696906 },
  },
].map((photo) => ({ ...photo, place: { detail: null, kind: 'Municipio', population: null, ...photo.place } }))

const ROTATE_MS = 6000

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function SignPhoto({ onPick }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const photo = PHOTOS[index]

  //Depende de index: al elegir una foto a mano, la cuenta vuelve a empezar
  useEffect(() => {
    if (paused || prefersReducedMotion()) return
    const timer = setTimeout(() => setIndex((index + 1) % PHOTOS.length), ROTATE_MS)
    return () => clearTimeout(timer)
  }, [paused, index])

  return (
    <figure
      className="w-full max-w-xl justify-self-center lg:max-w-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <button
        type="button"
        onClick={() => onPick(photo.place)}
        aria-label={`Ver el cartel más lejano de ${photo.place.name}`}
        className="group relative block aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-xl border border-white/15 bg-neutral-950 text-left"
      >
        {/*Todas apiladas: el cambio es un fundido, sin saltos de carga*/}
        {PHOTOS.map((item, itemIndex) => (
          <img
            key={item.file}
            src={`/hero/${item.file}-800.webp`}
            srcSet={`/hero/${item.file}-800.webp 800w, /hero/${item.file}.webp 1600w`}
            sizes="(min-width: 1024px) 560px, 100vw"
            alt={itemIndex === index ? `Cartel de carretera que indica ${item.place.name}` : ''}
            loading={itemIndex === 0 ? 'eager' : 'lazy'}
            fetchPriority={itemIndex === 0 ? 'high' : 'auto'}
            style={{ objectPosition: item.focus }}
            className={`absolute inset-0 size-full object-cover transition-[opacity,scale] duration-1000 ease-out group-hover:scale-[1.02] ${
              itemIndex === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}

        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-5 pt-16 pb-4 sm:px-6 sm:pb-5">
          <span className="block text-sm text-white/75">
            {photo.where}
          </span>
          <span className="mt-1 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {photo.place.name}
            </span>
            <span className="font-display text-3xl font-bold tracking-tight text-signal tabular-nums sm:text-4xl">
              {photo.km} km
            </span>
          </span>
        </span>
      </button>

      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <span className="flex gap-4" role="group" aria-label="Fotos">
          {PHOTOS.map((item, itemIndex) => (
            <button
              key={item.file}
              type="button"
              onClick={() => setIndex(itemIndex)}
              aria-pressed={itemIndex === index}
              className={`cursor-pointer underline-offset-4 transition-colors ${
                itemIndex === index ? 'text-white underline decoration-signal decoration-2' : 'text-white/50 hover:text-white'
              }`}
            >
              {item.place.name}
            </button>
          ))}
        </span>
        <a
          href={`https://www.mapillary.com/app/?pKey=${photo.imageId}`}
          target="_blank"
          rel="noopener"
          className="text-xs text-white/50 transition-colors hover:text-white"
        >
          Foto: {photo.author} · Mapillary · CC BY-SA
        </a>
      </figcaption>
    </figure>
  )
}

export default SignPhoto
