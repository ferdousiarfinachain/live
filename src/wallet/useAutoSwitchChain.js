import { appChain } from '../contracts/config.js'

function wrongNetworkError(targetChain = appChain) {
  return new Error(
    `Wrong network. Approve the switch to ${targetChain.name || 'the required network'} (Chain ID ${targetChain.id}) in your wallet.`,
  )
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
