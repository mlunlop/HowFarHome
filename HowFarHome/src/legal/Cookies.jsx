import { openPreferences, useConsent } from '../services/consent.js'
import { SITE_NAME } from '../site.js'
import LegalLayout, { Section, Table } from './LegalLayout.jsx'

const OWN = [
  ['howfarhome:consent', 'Necesaria', 'Recordar tu elección sobre cookies.', '12 meses'],
  ['howfarhome:v4:*', 'Necesaria', 'Caché de búsquedas para no repetir consultas a los servidores de mapas.', '30 días'],
  ['howfarhome:my-votes', 'Necesaria', 'Recordar qué has votado para no votar dos veces.', 'Hasta que borres los datos del sitio'],
  ['howfarhome:client-id', 'Necesaria', 'Identificador aleatorio para limitar el número de aportaciones.', 'Hasta que borres los datos del sitio'],
  ['howfarhome:votes, howfarhome:reports', 'Necesaria', 'Guardar votos y aportaciones cuando no hay conexión con el servidor.', 'Hasta que borres los datos del sitio'],
]

const THIRD = [
  ['Google (Street View)', 'Contenido de terceros', 'NID, AEC, SOCS y similares: preferencias, seguridad y medición de Google Maps.', 'Hasta 13 meses'],
  ['Google AdSense (si se activa)', 'Publicidad', '__gads, __gpi, __eoi, IDE y similares: mostrar anuncios, limitar su repetición y medirlos.', 'Hasta 13 meses'],
]

const BROWSERS = [
  ['Chrome', 'https://support.google.com/chrome/answer/95647?hl=es'],
  ['Firefox', 'https://support.mozilla.org/es/kb/Borrar%20cookies'],
  ['Safari', 'https://support.apple.com/es-es/guide/safari/sfri11471/mac'],
  ['Edge', 'https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09'],
]

function choiceText(consent) {
  if (!consent) return 'Todavía no has elegido.'
  const accepted = [consent.external && 'contenido de terceros', consent.ads && 'publicidad'].filter(Boolean)
  return accepted.length ? `Has aceptado: ${accepted.join(' y ')}.` : 'Has rechazado todas las cookies opcionales.'
}

function Cookies() {
  const consent = useConsent()

  return (
    <LegalLayout
      title="Política de cookies"
      intro={`${SITE_NAME} no usa cookies propias de análisis ni de publicidad. Solo guarda en tu navegador lo necesario para funcionar y, si lo aceptas, carga servicios de Google que sí instalan cookies.`}
    >
      <Section title="Tu elección">
        <p>{choiceText(consent)}</p>
        <button
          type="button"
          onClick={openPreferences}
          className="h-11 cursor-pointer rounded-lg bg-signal px-5 text-sm font-semibold text-black transition-colors hover:bg-white"
        >
          Cambiar mi elección
        </button>
      </Section>

      <Section title="Qué son las cookies">
        <p>
          Las cookies y tecnologías similares, como el almacenamiento local del navegador, son
          pequeños ficheros que una web guarda en tu dispositivo para recordar información. La ley
          (art. 22.2 LSSI-CE) exige tu consentimiento para todas salvo las estrictamente necesarias
          para prestar el servicio que pides.
        </p>
      </Section>

      <Section title="Almacenamiento propio (necesario)">
        <p>No requiere consentimiento, no se comparte con nadie y no sirve para identificarte.</p>
        <Table head={['Nombre', 'Tipo', 'Finalidad', 'Duración']} rows={OWN} />
      </Section>

      <Section title="Cookies de terceros (opcionales)">
        <p>
          Solo se cargan si las aceptas. Si las rechazas, en lugar de Street View verás un botón para
          cargarlo cuando quieras y no se mostrará publicidad.
        </p>
        <Table head={['Proveedor', 'Tipo', 'Cookies y finalidad', 'Duración']} rows={THIRD} />
        <p>
          Google Ireland Ltd. es responsable de estas cookies. Consulta{' '}
          <a href="https://policies.google.com/technologies/cookies?hl=es" target="_blank" rel="noopener">
            cómo usa Google las cookies
          </a>
          ,{' '}
          <a href="https://policies.google.com/technologies/partner-sites?hl=es" target="_blank" rel="noopener">
            cómo usa los datos de los sitios que usan sus servicios
          </a>{' '}
          y{' '}
          <a href="https://adssettings.google.com" target="_blank" rel="noopener">
            gestiona tus preferencias de anuncios
          </a>
          . Puede haber transferencias a EE. UU. amparadas por el Marco de Privacidad de Datos UE-EE. UU.
        </p>
      </Section>

      <Section title="Cómo retirar el consentimiento o borrar las cookies">
        <p>
          Pulsa «Configurar cookies» al pie de cualquier página o el botón de arriba. También puedes
          borrar las cookies y los datos del sitio desde tu navegador:
        </p>
        <ul>
          {BROWSERS.map(([name, url]) => (
            <li key={name}>
              <a href={url} target="_blank" rel="noopener">
                {name}
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </LegalLayout>
  )
}

export default Cookies
