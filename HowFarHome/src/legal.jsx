//Entrada de las páginas legales: cada HTML indica en <body data-page> cuál mostrar
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/inter'
import './index.css'
import CookieBanner from './components/CookieBanner.jsx'
import Cookies from './legal/Cookies.jsx'
import Credits from './legal/Credits.jsx'
import LegalNotice from './legal/LegalNotice.jsx'
import Privacy from './legal/Privacy.jsx'

const PAGES = {
  'aviso-legal': LegalNotice,
  privacidad: Privacy,
  cookies: Cookies,
  creditos: Credits,
}

const Page = PAGES[document.body.dataset.page]

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Page />
    <CookieBanner />
  </StrictMode>,
)
