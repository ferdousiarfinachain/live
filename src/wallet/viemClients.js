import { getPublicClient as wagmiGetPublicClient } from '@wagmi/core'
import { createPublicClient, http } from 'viem'
import { getChainById, getDefaultAppRpc } from './chains.js'
import { wagmiConfig } from './wagmiConfig.js'

const fallbackClients = new Map()

function createFallbackClient(chainId) {
  const normalizedChainId = Number(chainId)
  if (fallbackClients.has(normalizedChainId)) {
    return fallbackClients.get(normalizedChainId)
  }

  const chain = getChainById(normalizedChainId)
  if (!chain) {
    throw new Error(`Chain ${normalizedChainId} is not configured.`)
  }

  const client = createPublicClient({
    chain,
    transport: http(getDefaultAppRpc(chain)),
  })
  fallbackClients.set(normalizedChainId, client)
  return client
}

export function getPublicClient(chainId) {
  const normalizedChainId = Number(chainId)

  try {
    const client = wagmiGetPublicClient(wagmiConfig, { chainId: normalizedChainId })
    if (client) {
      return client
    }
  } catch {
    // Fall back to a dedicated public client below.
  }

  return createFallbackClient(normalizedChainId)
}
