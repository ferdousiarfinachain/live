import { formatUnits, parseEther, parseUnits } from 'viem'
import { readContract } from 'viem/actions'
import erc20Abi from '../contracts/abis/erc20.json'
import {
  appChain,
  isPresaleConfigured,
  presaleAbiExport,
  presaleContractAddress,
} from '../contracts/config.js'
import { getPublicClient } from './viemClients.js'

let cachedSaleDecimals = null
let cachedSaleDecimalsKey = ''
const paymentDecimalsCache = new Map()

const USD_PRICE_DECIMALS = 8

let cachedTokenPriceUsd = null
let cachedTokenPriceKey = ''
let cachedTokenPriceExpiresAt = 0
const TOKEN_PRICE_CACHE_MS = 30_000

function formatQuotedDisplay(tokenAmountWei, saleTokenDecimals) {
  const formatted = formatUnits(tokenAmountWei, saleTokenDecimals)
  const n = Number(formatted)
  if (!Number.isFinite(n)) {
    return formatted
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(n)
}

export function getPresaleContract() {
  if (!isPresaleConfigured || !presaleContractAddress) {
    return null
  }
  return {
    address: presaleContractAddress,
    chainId: appChain.id,
  }
}

export function getErc20Contract(tokenAddress, chain = appChain) {
  if (!tokenAddress) {
    return null
  }
  return {
    address: tokenAddress,
    chainId: chain.id,
  }
}

export function getPaymentTokenAddress(paymentMethod) {
  if (paymentMethod === 'BNB') {
    return null
  }
  return null
}

async function readPresaleContract(presaleContract, functionName, args = []) {
  const client = getPublicClient(presaleContract.chainId)
  return readContract(client, {
    address: presaleContract.address,
    abi: presaleAbiExport,
    functionName,
    args,
  })
}

async function readErc20Contract(tokenContract, functionName, args = []) {
  const client = getPublicClient(tokenContract.chainId)
  return readContract(client, {
    address: tokenContract.address,
    abi: erc20Abi,
    functionName,
    args,
  })
}

export async function readPaymentTokenDecimals(presaleContract, tokenAddress) {
  const cacheKey = `${presaleContract.address}:${tokenAddress.toLowerCase()}`
  if (paymentDecimalsCache.has(cacheKey)) {
    return paymentDecimalsCache.get(cacheKey)
  }

  try {
    const decimals = await readPresaleContract(presaleContract, 'paymentTokenDecimals', [tokenAddress])
    if (Number(decimals) > 0) {
      paymentDecimalsCache.set(cacheKey, Number(decimals))
      return Number(decimals)
    }
  } catch {
    // fall through to ERC20 decimals()
  }

  const tokenContract = getErc20Contract(tokenAddress, { id: presaleContract.chainId })
  if (!tokenContract) {
    throw new Error('Payment token contract is not configured.')
  }

  const decimals = await readErc20Contract(tokenContract, 'decimals')
  const resolved = Number(decimals)
  paymentDecimalsCache.set(cacheKey, resolved)
  return resolved
}

export async function readSaleTokenDecimals(presaleContract) {
  const cacheKey = `${presaleContract.chainId}:${presaleContract.address}`
  if (cachedSaleDecimalsKey === cacheKey && cachedSaleDecimals !== null) {
    return cachedSaleDecimals
  }

  const tokenAddress = await readPresaleContract(presaleContract, 'token')
  const tokenContract = getErc20Contract(tokenAddress, { id: presaleContract.chainId })
  if (!tokenContract) {
    cachedSaleDecimalsKey = cacheKey
    cachedSaleDecimals = 18
    return 18
  }
  try {
    const decimals = await readErc20Contract(tokenContract, 'decimals')
    const resolved = Number(decimals) || 18
    cachedSaleDecimalsKey = cacheKey
    cachedSaleDecimals = resolved
    return resolved
  } catch {
    cachedSaleDecimalsKey = cacheKey
    cachedSaleDecimals = 18
    return 18
  }
}

export function parseHumanAmount(amountHuman, decimals) {
  const raw = String(amountHuman ?? '').trim()
  if (!raw) {
    throw new Error('Enter an amount to pay.')
  }
  return parseUnits(raw, decimals)
}

export function formatTokenAmount(amountWei, decimals) {
  return formatUnits(amountWei, decimals)
}

export function getCachedPresaleTokenPriceUsd() {
  const presaleContract = getPresaleContract()
  if (!presaleContract) {
    return null
  }

  const cacheKey = `${presaleContract.chainId}:${presaleContract.address}`
  if (
    cachedTokenPriceKey === cacheKey &&
    cachedTokenPriceUsd !== null &&
    cachedTokenPriceExpiresAt > Date.now()
  ) {
    return cachedTokenPriceUsd
  }

  return null
}

export async function readPresaleTokenPriceUsd() {
  const presaleContract = getPresaleContract()
  if (!presaleContract) {
    return null
  }

  const cachedPrice = getCachedPresaleTokenPriceUsd()
  if (cachedPrice !== null) {
    return cachedPrice
  }

  const cacheKey = `${presaleContract.chainId}:${presaleContract.address}`

  try {
    const stage = await readPresaleContract(presaleContract, 'currentStage')
    const priceRaw = await readPresaleContract(presaleContract, 'usdPricePerTokenByStage', [
      BigInt(stage),
    ])
    const priceUsd = Number(formatUnits(priceRaw, USD_PRICE_DECIMALS))
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      return null
    }
    cachedTokenPriceKey = cacheKey
    cachedTokenPriceUsd = priceUsd
    cachedTokenPriceExpiresAt = Date.now() + TOKEN_PRICE_CACHE_MS
    return priceUsd
  } catch {
    return null
  }
}

export function formatUsdTokenPriceLabel(priceUsd) {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    return ''
  }
  const digits = priceUsd < 0.01 ? 4 : 2
  const formatted =
    digits === 4 ? String(Number(priceUsd.toFixed(digits))) : priceUsd.toFixed(digits)
  return `$${formatted}`
}

export async function quoteReceiveAmount(paymentMethod, amountHuman) {
  const presaleContract = getPresaleContract()
  if (!presaleContract) {
    return ''
  }

  const amount = String(amountHuman ?? '').trim()
  if (!amount || Number(amount) <= 0) {
    return ''
  }

  const saleTokenDecimals = await readSaleTokenDecimals(presaleContract)

  if (paymentMethod === 'BNB') {
    const tokenAmountWei = await readPresaleContract(presaleContract, 'quoteBuyWithBnb', [
      parseEther(amount),
    ])
    return formatQuotedDisplay(tokenAmountWei, saleTokenDecimals)
  }

  const paymentToken = getPaymentTokenAddress(paymentMethod)
  if (!paymentToken) {
    return ''
  }

  const paymentDecimals = await readPaymentTokenDecimals(presaleContract, paymentToken)
  const paymentWei = parseHumanAmount(amount, paymentDecimals)
  const tokenAmountWei = await readPresaleContract(presaleContract, 'quoteBuyWithToken', [
    paymentToken,
    paymentWei,
  ])
  return formatQuotedDisplay(tokenAmountWei, saleTokenDecimals)
}

export function prefetchQuoteMetadata() {
  if (!isPresaleConfigured) {
    return Promise.resolve()
  }
  const presaleContract = getPresaleContract()
  if (!presaleContract) {
    return Promise.resolve()
  }

  return Promise.allSettled([readSaleTokenDecimals(presaleContract)])
}

if (isPresaleConfigured) {
  prefetchQuoteMetadata()
}
