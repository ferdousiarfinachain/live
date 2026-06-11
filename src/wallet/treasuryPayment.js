import { parseEther } from 'viem'
import { readContract } from 'viem/actions'
import { sendTransaction, waitForTransactionReceipt, writeContract } from 'wagmi/actions'
import erc20Abi from '../contracts/abis/erc20.json'
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
import { getAccount } from 'wagmi/actions'
import { ensureTreasuryChain } from './useAutoSwitchChain.js'
import {
  getCachedPresaleTokenPriceUsd,
  getErc20Contract,
  parseHumanAmount,
  readPresaleTokenPriceUsd,
} from './presaleContract.js'
import { wagmiConfig } from './wagmiConfig.js'
import { getPublicClient } from './viemClients.js'

async function readErc20Decimals(tokenAddress, chain) {
  const client = getPublicClient(chain.id)
  const decimals = await readContract(client, {
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
  })
  return Number(decimals)
}

export async function payViaTreasury({
  chainId,
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

  await ensureTreasuryChain(treasuryNetworkKey, { chainId, switchChain })

  const amount = String(amountHuman ?? '').trim()
  if (!amount || Number(amount) <= 0) {
    throw new Error('Enter a valid amount to pay.')
  }

  let receipt

  if (paymentMethod === 'ETH') {
    const hash = await sendTransaction(wagmiConfig, {
      chainId: targetChain.id,
      to: treasuryAddress,
      value: parseEther(amount),
    })
    receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
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

    const hash = await writeContract(wagmiConfig, {
      address: tokenContract.address,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [treasuryAddress, amountWei],
      chainId: targetChain.id,
    })
    receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
  }

  assertConfirmedReceipt(receipt)

  const account = getAccount(wagmiConfig)
  const tokensEstimated =
    estimateTokensFromTreasuryPayment(paymentMethod, amount, {
      tokenPriceUsd: getCachedPresaleTokenPriceUsd(),
    }) || ''

  void (async () => {
    try {
      const [ethUsdPrice, tokenPriceUsd] = await Promise.all([
        paymentMethod === 'ETH' ? fetchEthUsdPrice(treasuryNetworkKey) : Promise.resolve(null),
        readPresaleTokenPriceUsd(),
      ])
      const novexAmount =
        estimateTokensFromTreasuryPayment(paymentMethod, amount, {
          ethUsdPrice,
          tokenPriceUsd,
        }) || tokensEstimated
      if (!novexAmount || !account.address) {
        return
      }
      await recordTreasuryPayment({
        walletAddress: account.address,
        amountPaid: amount,
        chainLabel: paymentMethod,
        networkKey: network.key,
        novexAmount,
      })
    } catch {
      // Popup already shown; on-chain payment succeeded.
    }
  })()

  return {
    transactionHash: receipt.transactionHash,
    paymentMethod,
    amountPaid: amount,
    chainId: targetChain.id,
    chainKey: network.key,
    tokensEstimated,
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
