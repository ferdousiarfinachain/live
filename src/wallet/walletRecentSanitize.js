import { SafeLocalStorage, SafeLocalStorageKeys } from '@reown/appkit-common'
import { ChainController, ConnectionController } from '@reown/appkit-controllers'

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

/** Fresh WC URI each connect — avoids stale iOS Safari pairings that trigger MetaMask warnings. */
export function resetWalletConnectSession() {
  clearRecentWallets()

  if (ChainController.state.activeCaipAddress) {
    return
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
