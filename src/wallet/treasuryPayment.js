import { prepareContractCall, prepareTransaction, readContract, sendAndConfirmTransaction } from 'thirdweb'
import { toWei } from 'thirdweb/utils'
import {
  getTreasuryAddress,
  getTreasuryChain,
  getTreasuryNetwork,
  getTreasuryTokenAddress,
  isTreasuryRouteConfigured,
} from '../contracts/treasuryChains.js'
import { fetchEthUsdPrice } from '../lib/chainlinkEthPrice.js'
import { estimateTokensFromTreasuryPayment } from '../lib/presaleEstimate.js'
import { recordTreasuryPayment } from '../lib/supabaseClient.js'
import { ensureTreasuryChain } from './useAutoSwitchChain.js'
import { thirdwebClient } from './thirdwebClient.js'
import { getErc20Contract, parseHumanAmount, readPresaleTokenPriceUsd } from './presaleContract.js'

async function readErc20Decimals(tokenAddress, chain) {
  const tokenContract = getErc20Contract(tokenAddress, chain)
  if (!tokenContract) {
    throw new Error('Payment token contract is not configured.')
  }
  const decimals = await readContract({
    contract: tokenContract,
    method: 'function decimals() view returns (uint8)',
  })
  return Number(decimals)
}

export async function payViaTreasury({
  account,
  wallet,
  walletChain,
  switchChain,
  paymentMethod,
  treasuryNetworkKey,
  amountHuman,
}) {
  if (!isTreasuryRouteConfigured(paymentMethod, treasuryNetworkKey)) {
    throw new Error(`${paymentMethod} payments on this network are not configured yet.`)
  }

  const treasuryAddress = getTreasuryAddress()
  if (!treasuryAddress) {
    throw new Error('Treasury address is missing in .env (VITE_TREASURY_ADDRESS).')
  }

  const network = getTreasuryNetwork(treasuryNetworkKey)
  const targetChain = getTreasuryChain(treasuryNetworkKey)
  if (!network || !targetChain) {
    throw new Error('Selected network is not supported.')
  }

  await ensureTreasuryChain(treasuryNetworkKey, { wallet, walletChain, switchChain })

  const amount = String(amountHuman ?? '').trim()
  if (!amount || Number(amount) <= 0) {
    throw new Error('Enter a valid amount to pay.')
  }

  let receipt

  if (paymentMethod === 'ETH') {
    const tx = prepareTransaction({
      client: thirdwebClient,
      chain: targetChain,
      to: treasuryAddress,
      value: toWei(amount),
    })
    receipt = await sendAndConfirmTransaction({ account, transaction: tx })
  } else {
    const tokenAddress = getTreasuryTokenAddress(paymentMethod, network.chainId)
    if (!tokenAddress) {
      throw new Error(`${paymentMethod} is not supported on ${network.label}.`)
    }

    const decimals = await readErc20Decimals(tokenAddress, targetChain)
    const amountWei = parseHumanAmount(amount, decimals)
    const tokenContract = getErc20Contract(tokenAddress, targetChain)
    if (!tokenContract) {
      throw new Error('Payment token contract is not configured.')
    }

    const tx = prepareContractCall({
      contract: tokenContract,
      method: 'function transfer(address to, uint256 amount)',
      params: [treasuryAddress, amountWei],
    })
    receipt = await sendAndConfirmTransaction({ account, transaction: tx })
  }

  assertConfirmedReceipt(receipt)

  const [ethUsdPrice, tokenPriceUsd] = await Promise.all([
    paymentMethod === 'ETH' ? fetchEthUsdPrice(treasuryNetworkKey) : Promise.resolve(null),
    readPresaleTokenPriceUsd(),
  ])
  const novexAmount = estimateTokensFromTreasuryPayment(paymentMethod, amount, {
    ethUsdPrice,
    tokenPriceUsd,
  })
  if (!novexAmount) {
    throw new Error('Could not calculate token amount from contract price.')
  }

  const dbResult = await recordTreasuryPayment({
    walletAddress: account.address,
    amountPaid: amount,
    chainLabel: paymentMethod,
    novexAmount,
  })

  if (!dbResult.ok) {
    throw new Error(
      dbResult.error || 'Payment confirmed on-chain but could not save to database.',
    )
  }

  return {
    transactionHash: receipt.transactionHash,
    paymentMethod,
    amountPaid: amount,
    chainId: targetChain.id,
    chainKey: network.key,
    tokensEstimated: novexAmount,
    dbRecorded: true,
  }
}

function assertConfirmedReceipt(receipt) {
  if (!receipt?.transactionHash) {
    throw new Error('Transaction was not completed.')
  }
  const status = String(receipt.status ?? 'success').toLowerCase()
  if (status === 'reverted' || status === 'failed' || status === '0') {
    throw new Error('Transaction failed on-chain.')
  }
}
