import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = path.dirname(fileURLToPath(import.meta.url))
const nm = (pkg) => path.resolve(root, 'node_modules', pkg)

/** Keeps a single viem module graph in prod — avoids "Class extends value undefined" (e.g. BaseError) on Vercel. */
function isViemVendorId(id) {
  const n = id.split(path.sep).join('/')
  return n.includes('/node_modules/viem/')
}

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      viem: nm('viem'),
      wagmi: nm('wagmi'),
      '@wagmi/core': nm('@wagmi/core'),
    },
    dedupe: [
      'react',
      'react-dom',
      'viem',
      'wagmi',
      '@wagmi/core',
      '@wagmi/connectors',
      '@reown/appkit',
      '@reown/appkit-common',
      '@reown/appkit-controllers',
      '@reown/appkit-utils',
    ],
  },
  optimizeDeps: {
    include: [
      'viem',
      'wagmi',
      '@wagmi/core',
      '@wagmi/connectors',
      '@reown/appkit',
      '@reown/appkit/core',
      '@reown/appkit-common',
      '@reown/appkit-controllers',
      '@reown/appkit-utils',
      '@walletconnect/ethereum-provider',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (isViemVendorId(id)) return 'viem'
        },
      },
    },
  },
})
