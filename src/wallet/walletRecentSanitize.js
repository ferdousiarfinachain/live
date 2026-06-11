import { SafeLocalStorage, SafeLocalStorageKeys } from '@reown/appkit-common'
import { StorageUtil } from '@reown/appkit-controllers'
import { WALLET_ORDER } from './Order.js'

/** Drop recent-wallet entries that are not in WALLET_ORDER. */
export function sanitizeRecentWallets(allowedIds = WALLET_ORDER) {
  const allowed = new Set(allowedIds)
  const recent = StorageUtil.getRecentWallets()
  const filtered = recent.filter((wallet) => allowed.has(wallet.id))

  if (filtered.length === recent.length) {
    return
  }

  try {
    SafeLocalStorage.setItem(SafeLocalStorageKeys.RECENT_WALLETS, JSON.stringify(filtered))

    if (filtered[0]) {
      SafeLocalStorage.setItem(SafeLocalStorageKeys.RECENT_WALLET, JSON.stringify(filtered[0]))
    } else {
      SafeLocalStorage.removeItem(SafeLocalStorageKeys.RECENT_WALLET)
    }
  } catch {
    /* ignore storage errors */
  }
}
