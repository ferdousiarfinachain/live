import { appChain } from '../contracts/config.js'
import { getTreasuryChain } from '../contracts/treasuryChains.js'

function wrongNetworkError(targetChain = appChain) {
  return new Error(
    `Wrong network. Approve the switch to ${targetChain.name || 'the required network'} (Chain ID ${targetChain.id}) in your wallet.`,
  )
}

export async function ensureTreasuryChain(networkKey, { chainId, switchChain }) {
  const targetChain = getTreasuryChain(networkKey)
  if (!targetChain) {
    throw new Error('Selected network is not configured.')
  }
  if (!switchChain) {
    throw new Error('Connect your wallet first.')
  }
  if (chainId === targetChain.id) {
    return targetChain
  }
  try {
    await switchChain({ chainId: targetChain.id })
  } catch {
    throw wrongNetworkError(targetChain)
  }
  return targetChain
}

export async function ensureAppChain({ chainId, switchChain }) {
  if (!switchChain) {
    throw new Error('Connect your wallet first.')
  }
  if (chainId === appChain.id) {
    return appChain
  }
  try {
    await switchChain({ chainId: appChain.id })
  } catch {
    throw wrongNetworkError(appChain)
  }
  return appChain
}
