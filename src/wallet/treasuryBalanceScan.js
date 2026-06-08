import { eth_getBalance, getRpcClient, readContract } from 'thirdweb'
import { toWei } from 'thirdweb/utils'
import { appChain } from '../contracts/config.js'
import {
  getConfiguredTreasuryNetworks,
  getTreasuryChain,
  getTreasuryNetwork,
  getTreasuryTokenAddress,
  isTreasuryMethodConfigured,
} from '../contracts/treasuryChains.js'
import { isTreasuryPaymentMethod, TREASURY_PAYMENT_METHODS } from '../lib/paymentMethods.js'
import { formatTokenAmount, getErc20Contract } from './presaleContract.js'
import { thirdwebClient } from './thirdwebClient.js'

const BNB_GAS_RESERVE = '0.00005'
const ETH_GAS_RESERVE_BY_NETWORK = {
  ethereum: '0.00001',
  arbitrum: '0.0002',
  base: '0.0002',
  optimism: '0.0002',
}
const BALANCE_FETCH_TIMEOUT_MS = 2_500
const BALANCE_CACHE_TTL_MS = 12_000
const BSC_STABLECOIN_DECIMALS = 18
const bestTreasuryBalanceInFlight = new Map()
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
  const reserveWei = toWei(reserveHuman)
  const spendableWei = balanceWei > reserveWei ? balanceWei - reserveWei : 0n
  const formatted = formatTokenAmount(spendableWei, 18)
  const n = Number(formatted)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function ethGasReserveForNetwork(networkKey) {
  return ETH_GAS_RESERVE_BY_NETWORK[networkKey] ?? '0.0002'
}

function spendableCacheKey(accountAddress, paymentMethod, networkKey) {
  return `${accountAddress.toLowerCase()}|${paymentMethod}|${networkKey}`
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

async function readErc20BalanceViaRpc(rpcUrl, tokenAddress, accountAddress) {
  const data = `0x70a08231${accountAddress.slice(2).toLowerCase().padStart(64, '0')}`
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: tokenAddress, data }, 'latest'],
    }),
  })
  const payload = await response.json()
  if (!payload?.result) {
    throw new Error('eth_call failed')
  }
  return BigInt(payload.result)
}

async function readTokenDecimals(tokenContract, networkKey) {
  if (networkKey === 'bsc') {
    return BSC_STABLECOIN_DECIMALS
  }
  return Number(
    await withTimeout(
      readContract({
        contract: tokenContract,
        method: 'function decimals() view returns (uint8)',
      }),
    ),
  )
}

async function fetchSpendableTreasuryBalance(accountAddress, paymentMethod, networkKey) {
  if (!accountAddress || !thirdwebClient || !networkKey) {
    return 0
  }

  try {
    if (paymentMethod === 'ETH') {
      const chain = getTreasuryChain(networkKey)
      if (!chain) {
        return 0
      }
      const rpc = getRpcClient({ client: thirdwebClient, chain })
      const balanceWei = await withTimeout(eth_getBalance(rpc, { address: accountAddress }))
      return spendableNativeBalance(balanceWei, ethGasReserveForNetwork(networkKey))
    }

    const network = getTreasuryNetwork(networkKey)
    const tokenAddress = network ? getTreasuryTokenAddress(paymentMethod, network.chainId) : null
    if (!tokenAddress) {
      return 0
    }

    if (networkKey === 'bsc') {
      const balanceWei = await withTimeout(
        readErc20BalanceViaRpc(appChain.rpc, tokenAddress, accountAddress),
      )
      const formatted = formatTokenAmount(balanceWei, BSC_STABLECOIN_DECIMALS)
      const n = Number(formatted)
      return Number.isFinite(n) && n > 0 ? n : 0
    }

    const chain =
      network?.chainId === appChain.id ? appChain : getTreasuryChain(networkKey)
    const tokenContract = getErc20Contract(tokenAddress, chain)
    if (!tokenContract) {
      return 0
    }

    const [decimals, balanceWei] = await Promise.all([
      readTokenDecimals(tokenContract, networkKey),
      withTimeout(
        readContract({
          contract: tokenContract,
          method: 'function balanceOf(address) view returns (uint256)',
          params: [accountAddress],
        }),
      ),
    ])

    const formatted = formatTokenAmount(balanceWei, decimals)
    const n = Number(formatted)
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

export async function getSpendableTreasuryBalance(accountAddress, paymentMethod, networkKey) {
  const cacheKey = spendableCacheKey(accountAddress, paymentMethod, networkKey)
  const cached = readSpendableCache(cacheKey)
  if (cached !== null) {
    return cached
  }

  const pending = spendableBalanceInFlight.get(cacheKey)
  if (pending) {
    return pending
  }

  const request = fetchSpendableTreasuryBalance(accountAddress, paymentMethod, networkKey)
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

async function fetchSpendableBnbBalance(accountAddress) {
  if (!accountAddress || !thirdwebClient) {
    return 0
  }
  const rpc = getRpcClient({ client: thirdwebClient, chain: appChain })
  const balanceWei = await withTimeout(eth_getBalance(rpc, { address: accountAddress }))
  return spendableNativeBalance(balanceWei, BNB_GAS_RESERVE)
}

export async function getSpendableBnbBalance(accountAddress) {
  const cacheKey = spendableCacheKey(accountAddress, 'BNB', 'bsc')
  const cached = readSpendableCache(cacheKey)
  if (cached !== null) {
    return cached
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

export function getCachedSpendableBalance(accountAddress, paymentMethod, walletChainId) {
  if (!accountAddress) {
    return null
  }
  if (paymentMethod === 'BNB') {
    return readSpendableCache(spendableCacheKey(accountAddress, 'BNB', 'bsc'))
  }
  if (!isTreasuryPaymentMethod(paymentMethod)) {
    return null
  }
  if (Number(walletChainId) === appChain.id) {
    return readSpendableCache(spendableCacheKey(accountAddress, paymentMethod, 'bsc'))
  }
  return null
}

export async function warmPaymentBalanceCache(accountAddress, walletChainId) {
  if (!accountAddress || !thirdwebClient) {
    return
  }

  const tasks = [getSpendableBnbBalance(accountAddress)]
  const useBscOnly =
    !Number.isFinite(Number(walletChainId)) ||
    Number(walletChainId) <= 0 ||
    Number(walletChainId) === appChain.id

  for (const paymentMethod of TREASURY_PAYMENT_METHODS) {
    if (!isTreasuryMethodConfigured(paymentMethod)) {
      continue
    }
    if (useBscOnly) {
      tasks.push(getSpendableTreasuryBalance(accountAddress, paymentMethod, 'bsc'))
      continue
    }
    tasks.push(getBestTreasuryBalance(accountAddress, paymentMethod, walletChainId))
  }

  await Promise.allSettled(tasks)
}

export function findTreasuryNetworkByChainId(paymentMethod, chainId) {
  const normalizedChainId = Number(chainId)
  if (!Number.isFinite(normalizedChainId) || normalizedChainId <= 0) {
    return null
  }
  return (
    getConfiguredTreasuryNetworks(paymentMethod).find(
      (network) => Number(network.chainId) === normalizedChainId,
    ) ?? null
  )
}

async function scanTreasuryBalances(accountAddress, paymentMethod, networks) {
  const balanceResults = await Promise.allSettled(
    networks.map(async (network) => ({
      networkKey: network.key,
      balance: await getSpendableTreasuryBalance(accountAddress, paymentMethod, network.key),
    })),
  )

  return balanceResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    return { networkKey: networks[index].key, balance: 0 }
  })
}

function pickBestBalance(balances, walletNetwork) {
  const sorted = [...balances].sort((a, b) => {
    if (b.balance !== a.balance) {
      return b.balance - a.balance
    }
    if (walletNetwork) {
      if (a.networkKey === walletNetwork.key) {
        return -1
      }
      if (b.networkKey === walletNetwork.key) {
        return 1
      }
    }
    return 0
  })
  if (sorted[0]?.balance > 0) {
    return sorted[0]
  }

  return null
}

export async function detectBestTreasuryNetwork(accountAddress, paymentMethod, walletChainId) {
  const { networkKey } = await getBestTreasuryBalance(
    accountAddress,
    paymentMethod,
    walletChainId,
  )
  return networkKey
}

async function resolveBestTreasuryBalance(accountAddress, paymentMethod, walletChainId) {
  const networks = getConfiguredTreasuryNetworks(paymentMethod)
  if (networks.length === 0) {
    return { networkKey: '', balance: 0 }
  }

  const walletNetwork = findTreasuryNetworkByChainId(paymentMethod, walletChainId)
  if (walletNetwork && Number(walletChainId) === appChain.id) {
    const walletBalance = await getSpendableTreasuryBalance(
      accountAddress,
      paymentMethod,
      walletNetwork.key,
    )
    return { networkKey: walletNetwork.key, balance: walletBalance }
  }

  const walletChainKnown =
    Number.isFinite(Number(walletChainId)) && Number(walletChainId) > 0
  if (!walletChainKnown) {
    const appNetwork = findTreasuryNetworkByChainId(paymentMethod, appChain.id)
    if (appNetwork) {
      const balance = await getSpendableTreasuryBalance(
        accountAddress,
        paymentMethod,
        appNetwork.key,
      )
      return { networkKey: appNetwork.key, balance }
    }
    return { networkKey: networks[0]?.key ?? '', balance: 0 }
  }

  const balances = await scanTreasuryBalances(accountAddress, paymentMethod, networks)
  const best = pickBestBalance(balances, walletNetwork)
  if (best) {
    return { networkKey: best.networkKey, balance: best.balance }
  }

  return { networkKey: networks[0]?.key ?? '', balance: 0 }
}

export async function getBestTreasuryBalance(accountAddress, paymentMethod, walletChainId) {
  if (!isTreasuryPaymentMethod(paymentMethod) || !accountAddress) {
    return { networkKey: '', balance: 0 }
  }

  const cacheKey = `${accountAddress}|${paymentMethod}|${walletChainId ?? ''}`
  const pending = bestTreasuryBalanceInFlight.get(cacheKey)
  if (pending) {
    return pending
  }

  const request = resolveBestTreasuryBalance(accountAddress, paymentMethod, walletChainId)
  bestTreasuryBalanceInFlight.set(cacheKey, request)
  try {
    return await request
  } finally {
    bestTreasuryBalanceInFlight.delete(cacheKey)
  }
}
