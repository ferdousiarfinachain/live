import { parseEther, parseUnits } from 'viem'
import { sendTransaction, waitForTransactionReceipt, writeContract } from 'wagmi/actions'
import erc20Abi from '../contracts/abis/erc20.json'
import { wagmiConfig } from '../wallet/wagmiConfig.js'
import { recordReferralCommission } from '../lib/referral.js'
import { recordTreasuryPayment } from './recordPayment.js'
import {
  getStablecoinContract,
  getStablecoinDecimals,
  getTreasuryChain,
  isTreasuryRouteConfigured,
  treasuryAddress,
} from './chains.js'
import { estimateTreasuryTokens } from './estimateTokens.js'

let paymentInFlight = false

function wrongNetworkError(chain) {
  return new Error(
    `Wrong network. Switch to ${chain.name} (Chain ID ${chain.id}) in your wallet.`,
  )
}

async function ensureTreasuryChain({ chainId, switchChain, targetChain }) {
  if (!switchChain) {
    throw new Error('Connect your wallet first.')
  }
  if (chainId === targetChain.id) {
    return targetChain
  }
  try {
    await switchChain({ chainId: targetChain.id })
  } catch {
    throw wrongNetworkError(targetChain)
  }
  return targetChain
}

async function sendTreasuryPayment({
  paymentMethod,
  amountHuman,
  networkKey,
  chainId,
  accountAddress,
}) {
  if (paymentMethod === 'ETH') {
    const hash = await sendTransaction(wagmiConfig, {
      to: treasuryAddress,
      value: parseEther(String(amountHuman).trim()),
      chainId,
      account: accountAddress,
    })
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
    return receipt.transactionHash
  }

  if (paymentMethod === 'USDT' || paymentMethod === 'USDC') {
    const tokenAddress = getStablecoinContract(paymentMethod, networkKey)
    const decimals = getStablecoinDecimals(paymentMethod, networkKey)
    const amountWei = parseUnits(String(amountHuman).trim(), decimals)
    const hash = await writeContract(wagmiConfig, {
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [treasuryAddress, amountWei],
      chainId,
      account: accountAddress,
    })
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
    return receipt.transactionHash
  }

  throw new Error('Unsupported treasury payment method.')
}

export async function payViaTreasury({
  paymentMethod,
  amountHuman,
  networkKey,
  accountAddress,
  walletChainId,
  switchChain,
}) {
  if (paymentInFlight) {
    throw new Error('A payment is already in progress. Please wait.')
  }

  if (!treasuryAddress) {
    throw new Error('Treasury wallet is not configured.')
  }
  if (!accountAddress) {
    throw new Error('Connect your wallet first.')
  }
  if (!networkKey || !isTreasuryRouteConfigured(paymentMethod, networkKey)) {
    throw new Error(`${paymentMethod} is not configured on the selected network.`)
  }

  const amount = String(amountHuman ?? '').trim()
  if (!amount || Number(amount) <= 0) {
    throw new Error('Enter a valid amount to pay.')
  }

  const targetChain = getTreasuryChain(networkKey)
  if (!targetChain) {
    throw new Error('Treasury network is not configured.')
  }

  paymentInFlight = true
  try {
    await ensureTreasuryChain({
      chainId: walletChainId,
      switchChain,
      targetChain,
    })

    const transactionHash = await sendTreasuryPayment({
      paymentMethod,
      amountHuman: amount,
      networkKey,
      chainId: targetChain.id,
      accountAddress,
    })

    const tokensEstimated = await estimateTreasuryTokens(paymentMethod, amount, {
      treasuryNetworkKey: networkKey,
    })
    const dbRecorded = await recordTreasuryPayment({
      walletAddress: accountAddress,
      amountPaid: amount,
      chainLabel: paymentMethod,
      novexAmount: tokensEstimated,
      networkKey,
    })

    try {
      await recordReferralCommission({
        walletAddress: accountAddress,
        amountPaid: amount,
        chainLabel: paymentMethod,
        novexAmount: tokensEstimated,
        networkKey,
      })
    } catch {
      /* referral logging must not block payment success */
    }

    return {
      transactionHash,
      chainId: targetChain.id,
      paymentMethod,
      amountPaid: amount,
      tokensEstimated,
      dbRecorded,
      networkKey,
    }
  } finally {
    paymentInFlight = false
  }
}

export function isTreasuryPaymentInFlight() {
  return paymentInFlight
}
