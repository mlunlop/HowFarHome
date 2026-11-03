// Datos del sitio y del titular que usan las páginas legales, el SEO y la publicidad.
// Los marcados con «PENDIENTE» hay que rellenarlos antes de publicar (LSSI-CE art. 10, RGPD art. 13).

export const SITE_NAME = 'HowFarHome?'
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://howfarhome.es').replace(/\/$/, '')
export const GITHUB_URL = 'https://github.com/mlunlop'
export const REPO_URL = 'https://github.com/mlunlop/HowFarHome'

export const OWNER = {
  name: 'PENDIENTE: nombre y apellidos del titular',
  nif: 'PENDIENTE: NIF',
  address: 'PENDIENTE: domicilio (calle, código postal, municipio, provincia)',
  email: 'PENDIENTE: correo de contacto',
  handle: 'mlunlop',
}

// Dónde está alojada la web (encargado del tratamiento de los registros del servidor).
export const HOSTING = {
  name: 'PENDIENTE: proveedor de alojamiento',
  url: '',
}

export const LEGAL_UPDATED = '3 de noviembre de 2026'

// Publicidad: sin estas variables no se carga nada de Google AdSense.
export const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || ''
export const ADSENSE_SLOT = import.meta.env.VITE_ADSENSE_SLOT || ''
export const adsEnabled = Boolean(ADSENSE_CLIENT && ADSENSE_SLOT)
