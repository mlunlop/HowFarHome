import { HOSTING, OWNER, SITE_NAME, SITE_URL } from '../site.js'
import LegalLayout, { Section } from './LegalLayout.jsx'

function LegalNotice() {
  return (
    <LegalLayout
      title="Aviso legal"
      intro="Información sobre quién está detrás de esta web y las condiciones para usarla."
    >
      <Section title="Titular">
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la
          información y de comercio electrónico (LSSI-CE), se informa de que el sitio web{' '}
          <strong>{SITE_URL.replace(/^https?:\/\//, '')}</strong> ({SITE_NAME}) es titularidad de:
        </p>
        <ul>
          <li>Titular: {OWNER.name}</li>
          <li>NIF: {OWNER.nif}</li>
          <li>Domicilio: {OWNER.address}</li>
          <li>
            Correo electrónico: <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>
          </li>
          <li>
            Alojamiento: {HOSTING.url ? <a href={HOSTING.url}>{HOSTING.name}</a> : HOSTING.name}
          </li>
        </ul>
      </Section>

      <Section title="Objeto">
        <p>
          {SITE_NAME} es un proyecto personal y gratuito que, a partir de un municipio o código postal
          de España, busca en datos abiertos el cartel de carretera más lejano que lo menciona y
          muestra su ubicación, la distancia y una imagen de Street View cuando existe.
        </p>
        <p>
          El uso de la web atribuye la condición de usuario e implica aceptar este aviso legal, la{' '}
          <a href="/privacidad/">política de privacidad</a> y la{' '}
          <a href="/cookies/">política de cookies</a>.
        </p>
      </Section>

      <Section title="Condiciones de uso">
        <p>
          Puedes usar la web libremente y sin registro. Te comprometes a no utilizarla con fines
          ilícitos ni a introducir en ella contenidos falsos, ofensivos o que vulneren derechos de
          terceros. Las aportaciones (votos, carteles añadidos y correcciones de posición) son
          públicas y anónimas: no escribas datos personales en las notas.
        </p>
        <p>
          El titular puede eliminar sin aviso cualquier aportación que considere inadecuada y limitar
          el número de aportaciones para evitar abusos.
        </p>
      </Section>

      <Section title="Exactitud de la información">
        <p>
          Los resultados se calculan automáticamente a partir de OpenStreetMap, Mapillary,
          CartoCiudad y otras fuentes abiertas, y de lecturas automáticas (OCR) de fotografías. Pueden
          contener errores u omisiones: un cartel solo aparece si alguien lo ha mapeado o fotografiado.
          Las distancias son orientativas y <strong>no deben usarse para navegar ni consultarse
          mientras se conduce</strong>.
        </p>
        <p>
          El titular no garantiza la disponibilidad continua de la web ni de los servicios de terceros
          de los que depende, y no responde de los daños derivados de su uso, salvo en los casos en
          que la ley no permita excluir esa responsabilidad.
        </p>
      </Section>

      <Section title="Propiedad intelectual e industrial">
        <p>
          El diseño, los textos y el código propio de {SITE_NAME} pertenecen a su titular. Los datos
          cartográficos, fotografías, tipografías y bibliotecas de terceros pertenecen a sus autores y
          se usan según sus licencias, detalladas en <a href="/creditos/">Créditos</a>. Google, Google
          Maps y Street View son marcas de Google LLC; {SITE_NAME} no está afiliado a Google,
          OpenStreetMap ni Mapillary.
        </p>
      </Section>

      <Section title="Enlaces a otros sitios">
        <p>
          La web enlaza a servicios de terceros (OpenStreetMap, Google Maps, Mapillary…). El titular
          no controla su contenido ni sus políticas y no se responsabiliza de ellos.
        </p>
      </Section>

      <Section title="Publicidad">
        <p>
          La web puede mostrar un banner de publicidad servido por Google AdSense para cubrir sus
          costes. Solo se carga si lo aceptas en el aviso de cookies. Más información en la{' '}
          <a href="/cookies/">política de cookies</a>.
        </p>
      </Section>

      <Section title="Legislación aplicable y jurisdicción">
        <p>
          Estas condiciones se rigen por la legislación española. Para cualquier controversia, las
          partes se someten a los juzgados y tribunales que correspondan conforme a la ley; si actúas
          como consumidor, serán los de tu domicilio.
        </p>
      </Section>
    </LegalLayout>
  )
}

export default LegalNotice
