import { useEffect, useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { resetWalletConnectSession } from './walletRecentSanitize.js'

const WAS_CONNECTED_KEY = 'novex_wallet_connected'
const SHORT_ADDRESS_KEY = 'novex_wallet_short'
const WALLET_RECONNECT_GRACE_MS = 2_500

function readSessionValue(key) {
  if (typeof window === 'undefined') {
    return ''
  }
  return window.sessionStorage.getItem(key) ?? ''
}

function readWasConnected() {
  return readSessionValue(WAS_CONNECTED_KEY) === '1'
}

export function useWalletSession() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''
  const [awaitingReconnect, setAwaitingReconnect] = useState(readWasConnected)

  useEffect(() => {
    if (!isConnected) {
      return
    }
    window.sessionStorage.setItem(WAS_CONNECTED_KEY, '1')
    if (shortAddress) {
      window.sessionStorage.setItem(SHORT_ADDRESS_KEY, shortAddress)
    }
    setAwaitingReconnect(false)
  }, [isConnected, shortAddress])

  useEffect(() => {
    if (!awaitingReconnect || isConnected) {
      return undefined
    }
    const timer = window.setTimeout(() => setAwaitingReconnect(false), WALLET_RECONNECT_GRACE_MS)
    return () => window.clearTimeout(timer)
  }, [awaitingReconnect, isConnected])

  const headerShortAddress =
    shortAddress || (awaitingReconnect ? readSessionValue(SHORT_ADDRESS_KEY) : '')

  function handleDisconnect() {
    window.sessionStorage.removeItem(WAS_CONNECTED_KEY)
    window.sessionStorage.removeItem(SHORT_ADDRESS_KEY)
    setAwaitingReconnect(false)
    disconnect()
    window.setTimeout(() => resetWalletConnectSession(), 0)
  }

  return {
    address,
    isConnected,
    presaleWalletConnected: isConnected || awaitingReconnect,
    showNoWalletLink: !isConnected && !awaitingReconnect,
    headerShortAddress,
    shortAddress,
    handleDisconnect,
  }
}
