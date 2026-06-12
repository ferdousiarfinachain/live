import { SafeLocalStorage, SafeLocalStorageKeys } from '@reown/appkit-common'

/** Reown appends a "recent" section after featured wallets when storage is non-empty. */
export function clearRecentWallets() {
  try {
    SafeLocalStorage.removeItem(SafeLocalStorageKeys.RECENT_WALLETS)
    SafeLocalStorage.removeItem(SafeLocalStorageKeys.RECENT_WALLET)
  } catch {
    /* ignore storage errors */
  }
}
