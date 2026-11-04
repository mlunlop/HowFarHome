import { GITHUB_URL, OWNER, REPO_URL, SITE_NAME } from '../site.js'
import LegalLayout, { Section } from './LegalLayout.jsx'

//Fotos de la portada: redimensionadas y recortadas, se publican con la misma licencia
const photo = (author, imageId, credit) => ({
  name: `Foto de ${author}`,
  url: `https://www.mapillary.com/app/?pKey=${imageId}`,
  license: 'CC BY-SA 4.0',
  credit: `${credit} Vía Mapillary, redimensionada y recortada.`,
})

const GROUPS = [
  {
    title: 'Fotos de la portada',
    items: [
      photo('iago', '534170937962831', 'Cartel de Lugo y Madrid en la A-6, A Coruña.'),
      photo('msevilla00', '938242003685177', 'Cartel de Valencia en la A-3, Madrid.'),
      photo('seraq', '1209884594016918', 'Pórtico de Zaragoza y Burgos en la M-40, Madrid.'),
      photo('m_esp_32', '977200608739263', 'Pórtico de Valencia, Zaragoza y Burgos en la M-50.'),
    ],
  },
  {
    title: 'Datos y mapas',
    items: [
      {
        name: 'OpenStreetMap',
        url: 'https://www.openstreetmap.org/copyright',
        license: 'ODbL 1.0',
        credit: '© colaboradores de OpenStreetMap. Los carteles, carreteras y municipios salen de aquí.',
      },
      {
        name: 'Mapillary',
        url: 'https://www.mapillary.com',
        license: 'CC BY-SA 4.0',
        credit: 'Fotos a pie de calle de su comunidad, en las que leemos los carteles con OCR.',
      },
      {
        name: 'CartoCiudad',
        url: 'https://www.cartociudad.es',
        license: 'CC BY 4.0',
        credit: '© Instituto Geográfico Nacional de España. Búsqueda de municipios y códigos postales.',
      },
      {
        name: 'Nominatim',
        url: 'https://nominatim.org',
        license: 'ODbL 1.0 (datos)',
        credit: 'Geocodificador de OpenStreetMap, servidor de la OpenStreetMap Foundation.',
      },
      {
        name: 'Overpass API',
        url: 'https://overpass-api.de',
        license: 'AGPL 3.0',
        credit: 'Consultas a OpenStreetMap, servidores de FOSSGIS e.V. y private.coffee.',
      },
      {
        name: 'OSRM',
        url: 'https://project-osrm.org',
        license: 'BSD 2-Clause',
        credit: 'Cálculo de rutas por carretera, servidor de demostración de Project OSRM.',
      },
      {
        name: 'Google Street View',
        url: 'https://www.google.com/streetview/',
        license: 'Condiciones de Google Maps',
        credit: 'Imágenes © Google. Se muestran mediante su visor incrustado.',
      },
    ],
  },
  {
    title: 'Herramientas de la web',
    items: [
      { name: 'React', url: 'https://react.dev', license: 'MIT', credit: 'Interfaz de usuario. © Meta Platforms, Inc.' },
      { name: 'Vite', url: 'https://vite.dev', license: 'MIT', credit: 'Servidor de desarrollo y empaquetado. © VoidZero Inc. y colaboradores.' },
      { name: 'Tailwind CSS', url: 'https://tailwindcss.com', license: 'MIT', credit: 'Estilos. © Tailwind Labs, Inc.' },
      { name: 'Leaflet', url: 'https://leafletjs.com', license: 'BSD 2-Clause', credit: 'Mapa interactivo. © Volodymyr Agafonkin y colaboradores.' },
      { name: 'React Leaflet', url: 'https://react-leaflet.js.org', license: 'Hippocratic 2.1', credit: 'Leaflet en React. © Paul Le Cam.' },
      { name: '@mapbox/vector-tile y pbf', url: 'https://github.com/mapbox/vector-tile-js', license: 'BSD 3-Clause', credit: 'Lectura de teselas vectoriales. © Mapbox.' },
      { name: 'Supabase', url: 'https://supabase.com', license: 'Apache 2.0', credit: 'Base de datos de votos y aportaciones.' },
      { name: 'Oxlint', url: 'https://oxc.rs', license: 'MIT', credit: 'Revisión del código. © VoidZero Inc. y colaboradores.' },
    ],
  },
  {
    title: 'Tipografías',
    items: [
      { name: 'Bricolage Grotesque', url: 'https://github.com/ateliertriay/bricolage', license: 'SIL OFL 1.1', credit: '© Mathieu Triay. Títulos.' },
      { name: 'Inter', url: 'https://rsms.me/inter/', license: 'SIL OFL 1.1', credit: '© Rasmus Andersson. Texto.' },
      { name: 'Fontsource', url: 'https://fontsource.org', license: 'MIT', credit: 'Tipografías servidas desde esta misma web, sin llamadas a Google Fonts.' },
    ],
  },
  {
    title: 'Lectura de carteles (OCR)',
    items: [
      { name: 'RapidOCR', url: 'https://github.com/RapidAI/RapidOCR', license: 'Apache 2.0', credit: 'Reconocimiento de texto en las fotos.' },
      { name: 'ONNX Runtime', url: 'https://onnxruntime.ai', license: 'MIT', credit: '© Microsoft Corporation.' },
      { name: 'OpenCV', url: 'https://opencv.org', license: 'Apache 2.0', credit: 'Tratamiento de imágenes.' },
      { name: 'Pillow y NumPy', url: 'https://python-pillow.org', license: 'MIT-CMU / BSD 3-Clause', credit: 'Imágenes y cálculo en Python.' },
      { name: 'mapbox-vector-tile', url: 'https://github.com/tilezen/mapbox-vector-tile', license: 'MIT', credit: 'Lectura de teselas de Mapillary en Python.' },
      { name: 'GitHub Actions', url: 'https://github.com/features/actions', license: 'Servicio de GitHub', credit: 'Ejecución del escaneo de toda España.' },
    ],
  },
]

function Credits() {
  return (
    <LegalLayout
      title="Créditos"
      intro={`${SITE_NAME} existe gracias a datos abiertos y software libre. Gracias a todas las personas que mapean, fotografían y programan.`}
    >
      <Section title="Autoría">
        <p>
          Idea, diseño y desarrollo de{' '}
          <a href={GITHUB_URL} target="_blank" rel="noopener author">
            {OWNER.handle}
          </a>
          . El código está en{' '}
          <a href={REPO_URL} target="_blank" rel="noopener">
            GitHub
          </a>
          .
        </p>
        <p>
          ¿Falta un cartel? Puedes añadirlo desde la web o, mejor aún, mapearlo en{' '}
          <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">
            OpenStreetMap
          </a>{' '}
          para que lo aprovechen todos.
        </p>
      </Section>

      {GROUPS.map((group) => (
        <Section key={group.title} title={group.title}>
          <ul className="!ml-0 divide-y divide-white/10 rounded-xl border border-white/15">
            {group.items.map((item) => (
              <li key={item.name} className="!ml-0 flex !list-none flex-col gap-1 px-4 py-3 !pl-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span>
                  <a href={item.url} target="_blank" rel="noopener" className="font-medium">
                    {item.name}
                  </a>
                  <span className="block text-sm text-white/60">{item.credit}</span>
                </span>
                <span className="shrink-0 text-sm text-white/60">{item.license}</span>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </LegalLayout>
  )
}

export default Credits
