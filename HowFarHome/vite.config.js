import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'

// Páginas estáticas: cada una es un HTML propio para que se indexe y funcione en cualquier alojamiento.
const PAGES = {
  main: { html: 'index.html', path: '/', priority: '1.0', changefreq: 'weekly' },
  avisoLegal: { html: 'aviso-legal/index.html', path: '/aviso-legal/', priority: '0.2', changefreq: 'yearly' },
  privacidad: { html: 'privacidad/index.html', path: '/privacidad/', priority: '0.2', changefreq: 'yearly' },
  cookies: { html: 'cookies/index.html', path: '/cookies/', priority: '0.2', changefreq: 'yearly' },
  creditos: { html: 'creditos/index.html', path: '/creditos/', priority: '0.4', changefreq: 'monthly' },
}

// Etiquetas comunes a todas las páginas. Consent Mode v2 arranca denegado hasta que la persona elige.
const COMMON_HEAD = `
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="theme-color" content="#141416" />
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('consent', 'default', {
        ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
        analytics_storage: 'denied', wait_for_update: 500
      });
    </script>`

function sitePages(siteUrl, adsenseClient) {
  const today = new Date().toISOString().slice(0, 10)
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.values(PAGES)
  .map(
    (page) =>
      `  <url><loc>${siteUrl}${page.path}</loc><lastmod>${today}</lastmod><changefreq>${page.changefreq}</changefreq><priority>${page.priority}</priority></url>`,
  )
  .join('\n')}
</urlset>
`
  const robots = `User-agent: *\nAllow: /\nDisallow: /sign-index/\n\nSitemap: ${siteUrl}/sitemap.xml\n`

  return {
    name: 'site-pages',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replaceAll('%SITE_URL%', siteUrl).replace('<meta name="viewport"', `${COMMON_HEAD.trim()}\n    <meta name="viewport"`),
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
      if (adsenseClient) {
        const publisher = adsenseClient.replace(/^ca-/, '')
        this.emitFile({ type: 'asset', fileName: 'ads.txt', source: `google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n` })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const siteUrl = (env.VITE_SITE_URL || 'https://howfarhome.es').replace(/\/$/, '')

  return {
    plugins: [react(), tailwindcss(), sitePages(siteUrl, env.VITE_ADSENSE_CLIENT)],
    build: {
      rollupOptions: {
        input: Object.fromEntries(Object.entries(PAGES).map(([name, page]) => [name, resolve(import.meta.dirname, page.html)])),
      },
    },
  }
})
