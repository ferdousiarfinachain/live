import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = path.dirname(fileURLToPath(import.meta.url))
const nm = (pkg) => path.resolve(root, 'node_modules', pkg)

/**
 * One vendor chunk for viem + wagmi + @wagmi/* so BaseError / ENS classes
 * never load from a different chunk graph (fixes Vercel "Class extends value undefined").
 */
function evmVendorChunk(id) {
  const n = id.split(path.sep).join('/')
  if (n.includes('/node_modules/viem/')) return 'evm-vendor'
  if (n.includes('/node_modules/wagmi/')) return 'evm-vendor'
  if (n.includes('/node_modules/@wagmi/')) return 'evm-vendor'
  return undefined
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
          return evmVendorChunk(id)
        },
      },
    },
  },
})
