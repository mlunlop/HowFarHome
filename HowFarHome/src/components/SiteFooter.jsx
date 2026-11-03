import { openPreferences } from '../services/consent.js'
import { GITHUB_URL, OWNER } from '../site.js'
import AdBanner from './AdBanner.jsx'

const LINKS = [
  { href: '/aviso-legal/', label: 'Aviso legal' },
  { href: '/privacidad/', label: 'Privacidad' },
  { href: '/cookies/', label: 'Cookies' },
  { href: '/creditos/', label: 'Créditos' },
]

const YEAR = new Date().getFullYear()
const linkClass ='transition-colors hover:text-white'

function SiteFooter({ children, className = '' }) {
  return (
    <footer className={`w-full text-center text-xs text-white/60 ${className}`}>
      <AdBanner />
      {children && <p className="mx-auto max-w-2xl text-pretty">{children}</p>}
      <nav aria-label="Información legal" className="mt-3">
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={linkClass}>
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <button type="button" onClick={openPreferences} className={`cursor-pointer ${linkClass}`}>
              Configurar cookies
            </button>
          </li>
        </ul>
      </nav>
      <p className="mt-2">
        © {YEAR} HowFarHome? · Hecho por{' '}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener author"
          className="font-medium text-white underline decoration-signal underline-offset-4 hover:text-signal"
        >
          {OWNER.handle}
        </a>
      </p>
    </footer>
  )
}

export default SiteFooter
