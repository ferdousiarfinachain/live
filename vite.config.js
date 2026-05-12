import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'viem',
      'wagmi',
      '@wagmi/core',
      '@reown/appkit',
      '@reown/appkit-common',
      '@reown/appkit-controllers',
      '@reown/appkit-utils',
    ],
  },
  optimizeDeps: {
    include: [
      '@reown/appkit',
      '@reown/appkit/core',
      '@reown/appkit-common',
      '@reown/appkit-controllers',
      '@reown/appkit-utils',
      '@walletconnect/ethereum-provider',
    ],
  },
})