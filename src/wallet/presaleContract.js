import { getContract } from 'thirdweb'
import { readContract } from 'thirdweb'
import { toWei } from 'thirdweb/utils'
import { formatUnits, parseUnits } from 'viem'
import erc20Abi from '../contracts/abis/erc20.json'
import {
  appChain,
  isPresaleConfigured,
  paymentTokenAddresses,
  presaleAbiExport,
  presaleContractAddress,
} from '../contracts/config.js'
import { thirdwebClient } from './thirdwebClient.js'

let cachedSaleDecimals = null
let cachedSaleDecimalsKey = ''
const paymentDecimalsCache = new Map()

function formatQuotedDisplay(tokenAmountWei, saleTokenDecimals) {
  const formatted = formatUnits(tokenAmountWei, saleTokenDecimals)
  const n = Number(formatted)
  if (!Number.isFinite(n)) {
    return formatted
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(n)
}

export function getPresaleContract() {
  if (!thirdwebClient || !presaleContractAddress) {
    return null
  }
  return getContract({
    client: thirdwebClient,
    chain: appChain,
    address: presaleContractAddress,
    abi: presaleAbiExport,
  })
}

export function getErc20Contract(tokenAddress) {
  if (!thirdwebClient || !tokenAddress) {
    return null
  }
  return getContract({
    client: thirdwebClient,
    chain: appChain,
    address: tokenAddress,
    abi: erc20Abi,
  })
}

export function getPaymentTokenAddress(paymentMethod) {
  if (paymentMethod === 'BNB') {
    return null
  }
  return paymentTokenAddresses[paymentMethod] ?? null
}

export async function readPaymentTokenDecimals(presaleContract, tokenAddress) {
  const cacheKey = `${presaleContract.address}:${tokenAddress.toLowerCase()}`
  if (paymentDecimalsCache.has(cacheKey)) {
    return paymentDecimalsCache.get(cacheKey)
  }

  try {
    const decimals = await readContract({
      contract: presaleContract,
      method: 'function paymentTokenDecimals(address paymentToken) view returns (uint8)',
      params: [tokenAddress],
    })
    if (Number(decimals) > 0) {
      paymentDecimalsCache.set(cacheKey, Number(decimals))
      return Number(decimals)
    }
  } catch {
    // fall through to ERC20 decimals()
  }

  const tokenContract = getErc20Contract(tokenAddress)
  if (!tokenContract) {
    throw new Error('Payment token contract is not configured.')
  }

  const decimals = await readContract({
    contract: tokenContract,
    method: 'function decimals() view returns (uint8)',
  })
  const resolved = Number(decimals)
  paymentDecimalsCache.set(cacheKey, resolved)
  return resolved
}

export async function readSaleTokenDecimals(presaleContract) {
  const cacheKey = `${presaleContract.chain.id}:${presaleContract.address}`
  if (cachedSaleDecimalsKey === cacheKey && cachedSaleDecimals !== null) {
    return cachedSaleDecimals
  }

  const tokenAddress = await readContract({
    contract: presaleContract,
    method: 'function token() view returns (address)',
  })
  const tokenContract = getErc20Contract(tokenAddress)
  if (!tokenContract) {
    cachedSaleDecimalsKey = cacheKey
    cachedSaleDecimals = 18
    return 18
  }
  try {
    const decimals = await readContract({
      contract: tokenContract,
      method: 'function decimals() view returns (uint8)',
    })
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
    const tokenAmountWei = await readContract({
      contract: presaleContract,
      method: 'function quoteBuyWithBnb(uint256 amount) view returns (uint256)',
      params: [toWei(amount)],
    })
    return formatQuotedDisplay(tokenAmountWei, saleTokenDecimals)
  }

  const paymentToken = getPaymentTokenAddress(paymentMethod)
  if (!paymentToken) {
    return ''
  }

  const paymentDecimals = await readPaymentTokenDecimals(presaleContract, paymentToken)
  const paymentWei = parseHumanAmount(amount, paymentDecimals)
  const tokenAmountWei = await readContract({
    contract: presaleContract,
    method:
      'function quoteBuyWithToken(address paymentToken, uint256 amount) view returns (uint256)',
    params: [paymentToken, paymentWei],
  })
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

  const tasks = [readSaleTokenDecimals(presaleContract)]
  for (const method of ['USDT', 'USDC']) {
    const tokenAddress = getPaymentTokenAddress(method)
    if (tokenAddress) {
      tasks.push(readPaymentTokenDecimals(presaleContract, tokenAddress))
    }
  }
  return Promise.allSettled(tasks)
}

if (isPresaleConfigured) {
  prefetchQuoteMetadata()
}
