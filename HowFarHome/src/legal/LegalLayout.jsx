import SiteFooter from '../components/SiteFooter.jsx'
import { LEGAL_UPDATED } from '../site.js'

//Estilos de texto largo compartidos por las páginas legales
export function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-white">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-white/80 [&_a]:text-white [&_a]:underline [&_a]:decoration-signal [&_a]:underline-offset-4 [&_a:hover]:text-signal [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-white">
        {children}
      </div>
    </section>
  )
}

export function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/15">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-white/5 text-white">
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col" className="px-3 py-2 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 align-top">
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td key={index} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LegalLayout({ title, intro, children }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl animate-screen-in flex-col px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <a href="/" className="font-display text-2xl font-bold tracking-tight text-signal sm:text-3xl">
          HowFarHome?
        </a>
      </header>

      <main className="mt-12 flex-1">
        <h1 className="font-display text-[clamp(2.25rem,7vw,3.5rem)] leading-[1.05] font-bold tracking-tight text-signal">
          {title}
        </h1>
        {intro && <p className="mt-4 text-lg leading-relaxed text-pretty text-white">{intro}</p>}
        <p className="mt-2 text-sm text-white/60">Última actualización: {LEGAL_UPDATED}</p>
        {children}
      </main>

      <SiteFooter className="mt-16" />
    </div>
  )
}

export default LegalLayout
