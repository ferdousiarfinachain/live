import { createPublicClient, formatUnits, http, parseEther } from 'viem'
import { getBalance, readContract } from 'viem/actions'
import erc20Abi from '../contracts/abis/erc20.json'
import { isWalletConfigured } from '../wallet/walletMetadata.js'
import {
  getConfiguredTreasuryNetworks,
  getStablecoinContract,
  getStablecoinDecimals,
  getTreasuryChain,
  getTreasuryNetworkKeyByChainId,
  isTreasuryRouteConfigured,
  TREASURY_RPC_URLS,
} from './chains.js'

const ETH_GAS_RESERVE = '0.00005'
const SCAN_TIMEOUT_MS = 4_500
const BALANCE_CACHE_TTL_MS = 30_000
const BEST_NETWORK_CACHE_TTL_MS = 30_000

const scanClients = new Map()
const spendableBalanceCache = new Map()
const scanInFlight = new Map()
const bestNetworkCache = new Map()
const detectBestInFlight = new Map()

function withTimeout(promise, timeoutMs = SCAN_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error('Balance scan timed out')), timeoutMs)
    }),
  ])
}

export function getTreasuryScanClient(networkKey) {
  const chain = getTreasuryChain(networkKey)
  if (!chain) {
    throw new Error(`Treasury chain ${networkKey} is not configured.`)
  }

  if (scanClients.has(chain.id)) {
    return scanClients.get(chain.id)
  }

  const rpcUrl = TREASURY_RPC_URLS[networkKey] || chain.rpcUrls?.default?.http?.[0]
  if (!rpcUrl) {
    throw new Error(`No public RPC configured for chain ${chain.id}.`)
  }

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl, { timeout: SCAN_TIMEOUT_MS }),
  })
  scanClients.set(chain.id, client)
  return client
}

function spendableNativeBalance(balanceWei, reserveHuman) {
  const reserveWei = parseEther(reserveHuman)
  const spendableWei = balanceWei > reserveWei ? balanceWei - reserveWei : 0n
  const formatted = formatUnits(spendableWei, 18)
  const value = Number(formatted)
  return Number.isFinite(value) && value > 0 ? value : 0
}

function scanCacheKey(accountAddress, paymentMethod, networkKey) {
  return `${accountAddress.toLowerCase()}|${paymentMethod}|${networkKey}`
}

function bestCacheKey(accountAddress, paymentMethod) {
  return `${accountAddress.toLowerCase()}|${paymentMethod}`
}

function readScanCache(cacheKey) {
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

function writeScanCache(cacheKey, value) {
  spendableBalanceCache.set(cacheKey, { value, at: Date.now() })
}

export function getCachedBestTreasuryNetwork(accountAddress, paymentMethod) {
  if (!accountAddress || !paymentMethod) {
    return null
  }
  const entry = bestNetworkCache.get(bestCacheKey(accountAddress, paymentMethod))
  if (!entry || Date.now() - entry.at > BEST_NETWORK_CACHE_TTL_MS) {
    return null
  }
  return entry.value
}

function writeBestCache(accountAddress, paymentMethod, value) {
  bestNetworkCache.set(bestCacheKey(accountAddress, paymentMethod), { value, at: Date.now() })
}

function orderNetworksForScan(networks, walletChainId) {
  const walletNetworkKey = getTreasuryNetworkKeyByChainId(walletChainId)
  if (!walletNetworkKey || !networks.includes(walletNetworkKey)) {
    return networks
  }
  return [walletNetworkKey, ...networks.filter((networkKey) => networkKey !== walletNetworkKey)]
}

async function readNativeBalance(accountAddress, networkKey) {
  const client = getTreasuryScanClient(networkKey)
  const balanceWei = await withTimeout(getBalance(client, { address: accountAddress }))
  return spendableNativeBalance(balanceWei, ETH_GAS_RESERVE)
}

async function readStablecoinBalance(accountAddress, paymentMethod, networkKey) {
  const tokenAddress = getStablecoinContract(paymentMethod, networkKey)
  if (!tokenAddress) {
    return 0
  }
  const decimals = getStablecoinDecimals(paymentMethod, networkKey)
  const client = getTreasuryScanClient(networkKey)
  const balanceWei = await withTimeout(
    readContract(client, {
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [accountAddress],
    }),
  )
  const formatted = formatUnits(balanceWei, decimals)
  const value = Number(formatted)
  return Number.isFinite(value) && value > 0 ? value : 0
}

async function readNetworkBalance(accountAddress, paymentMethod, networkKey) {
  if (!isTreasuryRouteConfigured(paymentMethod, networkKey)) {
    return 0
  }

  const cacheKey = scanCacheKey(accountAddress, paymentMethod, networkKey)
  const cached = readScanCache(cacheKey)
  if (cached !== null) {
    return cached
  }

  const pending = scanInFlight.get(cacheKey)
  if (pending) {
    return pending
  }

  const request = (async () => {
    let balance = 0
    if (paymentMethod === 'ETH') {
      balance = await readNativeBalance(accountAddress, networkKey)
    } else if (paymentMethod === 'USDT' || paymentMethod === 'USDC') {
      balance = await readStablecoinBalance(accountAddress, paymentMethod, networkKey)
    }
    writeScanCache(cacheKey, balance)
    return balance
  })()

  scanInFlight.set(cacheKey, request)
  try {
    return await request
  } finally {
    scanInFlight.delete(cacheKey)
  }
}

async function runBestNetworkDetect(accountAddress, paymentMethod, walletChainId) {
  const networks = orderNetworksForScan(
    getConfiguredTreasuryNetworks(paymentMethod),
    walletChainId,
  )

  const ranked = (
    await Promise.all(
      networks.map(async (networkKey) => {
        try {
          const balance = await readNetworkBalance(accountAddress, paymentMethod, networkKey)
          return { networkKey, balance }
        } catch {
          return { networkKey, balance: 0 }
        }
      }),
    )
  ).sort((a, b) => b.balance - a.balance)

  const best = ranked.find((entry) => entry.balance > 0)
  const result = {
    networkKey: best?.networkKey ?? networks[0] ?? '',
    balance: best?.balance ?? 0,
    ranked,
  }
  writeBestCache(accountAddress, paymentMethod, result)
  return result
}

export async function scanTreasuryBalances(accountAddress, paymentMethod, walletChainId) {
  if (!accountAddress) {
    return []
  }

  const result = await detectBestTreasuryNetwork(accountAddress, paymentMethod, { walletChainId })
  return result.ranked
}

export async function detectBestTreasuryNetwork(
  accountAddress,
  paymentMethod,
  { walletChainId = null, forceRefresh = false } = {},
) {
  if (!accountAddress) {
    return {
      networkKey: getConfiguredTreasuryNetworks(paymentMethod)[0] ?? '',
      balance: 0,
      ranked: [],
    }
  }

  const cacheKey = bestCacheKey(accountAddress, paymentMethod)
  const cached = !forceRefresh ? getCachedBestTreasuryNetwork(accountAddress, paymentMethod) : null

  if (cached && !detectBestInFlight.has(cacheKey)) {
    void runBestNetworkDetect(accountAddress, paymentMethod, walletChainId).catch(() => {})
    return cached
  }

  const pending = detectBestInFlight.get(cacheKey)
  if (pending) {
    return pending
  }

  const request = runBestNetworkDetect(accountAddress, paymentMethod, walletChainId)
  detectBestInFlight.set(cacheKey, request)
  try {
    return await request
  } finally {
    detectBestInFlight.delete(cacheKey)
  }
}

export async function getTreasurySpendableBalance(
  accountAddress,
  paymentMethod,
  networkKey,
) {
  if (!accountAddress || !networkKey) {
    return 0
  }
  return readNetworkBalance(accountAddress, paymentMethod, networkKey)
}

export function getCachedTreasuryBalance(accountAddress, paymentMethod, networkKey) {
  if (!accountAddress || !networkKey) {
    return null
  }
  return readScanCache(scanCacheKey(accountAddress, paymentMethod, networkKey))
}

export async function warmTreasuryBalanceCache(accountAddress, paymentMethod, walletChainId) {
  if (!accountAddress || !isWalletConfigured) {
    return
  }
  await detectBestTreasuryNetwork(accountAddress, paymentMethod, { walletChainId }).catch(() => {})
}
