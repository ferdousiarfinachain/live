import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function resolveDeployOrigin() {
  const raw =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    process.env.CF_PAGES_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    ''
  const host = raw.toString().trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  return host ? `https://${host}` : ''
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-og-urls',
      transformIndexHtml(html) {
        const origin = resolveDeployOrigin()
        const ogImageUrl = origin ? `${origin}/social-preview-og.jpg` : '/social-preview-og.jpg'
        const ogPageUrl = origin ? `${origin}/` : ''
        return html
          .replace(/%OG_IMAGE_URL%/g, ogImageUrl)
          .replace(/%OG_PAGE_URL%/g, ogPageUrl)
      },
    },
  ],
  base: '/',
})
