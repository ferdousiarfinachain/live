import { parseEther } from 'viem'
import { getBalance } from 'viem/actions'
import { appChain } from '../contracts/config.js'
import { formatTokenAmount } from './presaleContract.js'
import { isWalletConfigured } from './walletMetadata.js'
import { getPublicClient } from './viemClients.js'

const BNB_GAS_RESERVE = '0.00005'
const BALANCE_FETCH_TIMEOUT_MS = 2_500
const BALANCE_CACHE_TTL_MS = 12_000
const spendableBalanceCache = new Map()
const spendableBalanceInFlight = new Map()

function withTimeout(promise, timeoutMs = BALANCE_FETCH_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('Balance fetch timed out')), timeoutMs)
    }),
  ])
}

function spendableNativeBalance(balanceWei, reserveHuman) {
  const reserveWei = parseEther(reserveHuman)
  const spendableWei = balanceWei > reserveWei ? balanceWei - reserveWei : 0n
  const formatted = formatTokenAmount(spendableWei, 18)
  const n = Number(formatted)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function spendableCacheKey(accountAddress) {
  return `${accountAddress.toLowerCase()}|BNB|bsc`
}

function readSpendableCache(cacheKey) {
  const entry = spendableBalanceCache.get(cacheKey)
  if (!entry) {
    return null
  }
  if (Date.now() - entry.at > BALANCE_CACHE_TTL_MS) {
    spendableBalanceCache.delete(cacheKey)
    return null
  }
  return entry.value
}

function writeSpendableCache(cacheKey, value) {
  spendableBalanceCache.set(cacheKey, { value, at: Date.now() })
}

async function fetchSpendableBnbBalance(accountAddress) {
  if (!accountAddress || !isWalletConfigured) {
    return 0
  }
  const client = getPublicClient(appChain.id)
  const balanceWei = await withTimeout(getBalance(client, { address: accountAddress }))
  return spendableNativeBalance(balanceWei, BNB_GAS_RESERVE)
}

export async function getSpendableBnbBalance(accountAddress, { bypassCache = false } = {}) {
  const cacheKey = spendableCacheKey(accountAddress)
  if (!bypassCache) {
    const cached = readSpendableCache(cacheKey)
    if (cached !== null) {
      return cached
    }
  }

  const pending = spendableBalanceInFlight.get(cacheKey)
  if (pending) {
    return pending
  }

  const request = fetchSpendableBnbBalance(accountAddress)
  spendableBalanceInFlight.set(cacheKey, request)
  try {
    const value = await request
    if (value > 0) {
      writeSpendableCache(cacheKey, value)
    }
    return value
  } finally {
    spendableBalanceInFlight.delete(cacheKey)
  }
}

export function getCachedSpendableBnbBalance(accountAddress) {
  if (!accountAddress) {
    return null
  }
  return readSpendableCache(spendableCacheKey(accountAddress))
}

export async function warmBnbBalanceCache(accountAddress) {
  if (!accountAddress || !isWalletConfigured) {
    return
  }
  await getSpendableBnbBalance(accountAddress).catch(() => {})
}
