import { HOSTING, OWNER, SITE_NAME } from '../site.js'
import LegalLayout, { Section, Table } from './LegalLayout.jsx'

const TREATMENTS = [
  [
    'Búsquedas de municipios',
    'Texto que escribes (municipio o código postal), coordenadas del lugar y tu dirección IP, que llega a los servicios de mapas consultados.',
    'Interés legítimo en prestar el servicio que pides (art. 6.1.f RGPD).',
    'No se guardan en nuestros servidores. El resultado se guarda 30 días solo en tu navegador.',
  ],
  [
    'Votos y aportaciones',
    'Voto (sí/no), municipio, posición del cartel, nota opcional, un identificador aleatorio de tu navegador y la fecha.',
    'Interés legítimo en mantener una base de carteles colaborativa y evitar abusos (art. 6.1.f RGPD).',
    'Mientras la web siga activa o hasta que pidas su supresión. Son públicos y anónimos.',
  ],
  [
    'Street View',
    'Tu dirección IP y las cookies que instale Google al mostrar la imagen.',
    'Tu consentimiento (art. 6.1.a RGPD).',
    'Según la política de Google.',
  ],
  [
    'Publicidad (si se activa)',
    'Identificadores de cookies, dirección IP y datos de navegación que recoge Google AdSense.',
    'Tu consentimiento (art. 6.1.a RGPD).',
    'Según la política de Google.',
  ],
  [
    'Registros del servidor',
    'Dirección IP, fecha, página pedida y navegador, que el alojamiento registra automáticamente.',
    'Interés legítimo en la seguridad de la web (art. 6.1.f RGPD).',
    'Según el proveedor de alojamiento, normalmente pocas semanas.',
  ],
  [
    'Contacto por correo',
    'Tu dirección de correo y lo que nos cuentes.',
    'Tu consentimiento al escribirnos y el interés legítimo en responderte.',
    'El tiempo necesario para atender tu consulta.',
  ],
]

const RECIPIENTS = [
  ['CartoCiudad (Instituto Geográfico Nacional)', 'España', 'Encontrar municipios y códigos postales.'],
  ['Nominatim (OpenStreetMap Foundation)', 'Reino Unido (decisión de adecuación)', 'Encontrar municipios.'],
  ['Overpass API (FOSSGIS e.V. y private.coffee)', 'Unión Europea', 'Consultar los carteles de OpenStreetMap.'],
  ['OSRM (Project OSRM / FOSSGIS e.V.)', 'Unión Europea', 'Calcular la ruta por carretera.'],
  ['Teselas de OpenStreetMap (OpenStreetMap Foundation)', 'Reino Unido (decisión de adecuación)', 'Mostrar el mapa al añadir o mover un cartel.'],
  ['Supabase Inc.', 'Según la región del proyecto; garantías mediante cláusulas contractuales tipo', 'Guardar votos y aportaciones.'],
  ['Google Ireland Ltd. / Google LLC', 'UE y EE. UU. (Marco de Privacidad de Datos UE-EE. UU.)', 'Street View y, si se activa, publicidad.'],
  [HOSTING.name, HOSTING.location, 'Alojar la web y protegerla frente a ataques.'],
]

function Privacy() {
  return (
    <LegalLayout
      title="Política de privacidad"
      intro={`${SITE_NAME} no pide registro, no tiene cuentas de usuario y recoge lo mínimo para funcionar. Aquí te contamos qué datos se tratan y por qué.`}
    >
      <Section title="Responsable del tratamiento">
        <ul>
          <li>Responsable: {OWNER.name}</li>
          <li>DNI: {OWNER.DNI}</li>
          <li>
            Contacto: <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>
          </li>
        </ul>
        <p>
          Esta política cumple el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 de
          Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).
        </p>
      </Section>

      <Section title="Qué datos tratamos, para qué y durante cuánto tiempo">
        <Table head={['Finalidad', 'Datos', 'Base legal', 'Conservación']} rows={TREATMENTS} />
        <p>
          El identificador de navegador es un número aleatorio que se genera en tu dispositivo y solo
          sirve para limitar el número de aportaciones. No lo relacionamos con tu nombre ni con tu IP.
          No elaboramos perfiles ni tomamos decisiones automatizadas que te afecten.
        </p>
      </Section>

      <Section title="Con quién se comparten">
        <p>
          Para funcionar, tu navegador se conecta directamente con estos servicios, que reciben tu
          dirección IP como en cualquier visita a una web. No vendemos ni cedemos datos a nadie más,
          salvo obligación legal.
        </p>
        <Table head={['Servicio', 'Ubicación y garantías', 'Para qué']} rows={RECIPIENTS} />
      </Section>

      <Section title="Tus derechos">
        <p>
          Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión,
          oposición, limitación del tratamiento y portabilidad, y retirar tu consentimiento sin que
          afecte a lo tratado antes, escribiendo a <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>.
          Para localizar tus aportaciones, indica el valor de <code>howfarhome:client-id</code> que
          guarda tu navegador (herramientas de desarrollo → Almacenamiento local).
        </p>
        <p>
          Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la{' '}
          <a href="https://www.aepd.es" target="_blank" rel="noopener">
            Agencia Española de Protección de Datos
          </a>
          .
        </p>
      </Section>

      <Section title="Menores">
        <p>
          La web no está dirigida a menores de 14 años. Si eres menor de esa edad, no envíes
          aportaciones ni aceptes cookies sin permiso de tus padres o tutores.
        </p>
      </Section>

      <Section title="Seguridad">
        <p>
          La web se sirve siempre por HTTPS, las aportaciones solo se pueden añadir (nadie puede
          editarlas ni borrarlas desde fuera) y las claves que usa el navegador son públicas y de solo
          inserción.
        </p>
      </Section>

      <Section title="Cambios en esta política">
        <p>
          Si cambia la forma de tratar los datos actualizaremos esta página y, si hace falta tu
          consentimiento, te lo volveremos a pedir.
        </p>
      </Section>
    </LegalLayout>
  )
}

export default Privacy
