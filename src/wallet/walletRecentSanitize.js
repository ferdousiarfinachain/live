import { SafeLocalStorage, SafeLocalStorageKeys } from '@reown/appkit-common'
import { ChainController, ConnectionController, OptionsController } from '@reown/appkit-controllers'
import { getAppMetadata } from './walletMetadata.js'

/** Reown appends a "recent" section after featured wallets when storage is non-empty. */
export function clearRecentWallets() {
  try {
    SafeLocalStorage.removeItem(SafeLocalStorageKeys.RECENT_WALLETS)
    SafeLocalStorage.removeItem(SafeLocalStorageKeys.RECENT_WALLET)
    SafeLocalStorage.removeItem(SafeLocalStorageKeys.DEEPLINK_CHOICE)
  } catch {
    /* ignore storage errors */
  }
}

function clearWalletConnectLocalStorage() {
  if (typeof localStorage === 'undefined') {
    return
  }

  const keysToRemove = []

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key) {
      continue
    }

    if (
      key.startsWith('wc@') ||
      key.startsWith('@appkit/') ||
      key.startsWith('@w3m/') ||
      key.startsWith('WALLETCONNECT') ||
      key.toLowerCase().includes('walletconnect')
    ) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore storage errors */
    }
  })
}

/** Fresh WC URI + metadata each connect — clears stale pairings on the live domain. */
export function resetWalletConnectSession() {
  if (ChainController.state.activeCaipAddress) {
    return
  }

  clearRecentWallets()
  clearWalletConnectLocalStorage()

  try {
    OptionsController.setMetadata(getAppMetadata())
  } catch {
    /* ignore */
  }

  try {
    ConnectionController.resetWcConnection()
  } catch {
    try {
      ConnectionController.resetUri()
    } catch {
      /* ignore */
    }
  }
}
