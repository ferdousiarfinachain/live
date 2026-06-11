import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { readContract } from 'wagmi/actions'
import { chainId, isPresaleConfigured, presaleAbiExport, presaleContractAddress } from '../contracts/config.js'
import {
  formatTokenAmount,
  formatUsdTokenPriceLabel,
  getPresaleContract,
  readPresaleTokenPriceUsd,
  readSaleTokenDecimals,
} from './presaleContract.js'
import { wagmiConfig } from './wagmiConfig.js'

const REFRESH_MS = 15_000
const PRESALE_USD_GOAL = 1_000_000

const CACHE_KEY = `presale-stats:${chainId}:${presaleContractAddress || 'none'}`
const listeners = new Set()
let inflightPromise = null

function formatCompactUsd(value) {
  if (!Number.isFinite(value) || value < 0) {
    return '$0'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function resolveSaleStatus({ isSaleActive, startTime, endTime, nowSec }) {
  if (isSaleActive) {
    return { label: 'Presale LIVE', tone: 'live' }
  }
  if (startTime > 0 && nowSec < startTime) {
    return { label: 'Presale Soon', tone: 'soon' }
  }
  if (endTime > 0 && nowSec > endTime) {
    return { label: 'Presale Ended', tone: 'ended' }
  }
  return { label: 'Presale Paused', tone: 'paused' }
}

function createFallbackStats() {
  const usdGoal = PRESALE_USD_GOAL
  return {
    loading: isPresaleConfigured,
    error: '',
    statusLabel: 'Presale LIVE',
    statusTone: 'live',
    raisedUsd: 0,
    raisedLabel: formatCompactUsd(0),
    goalLabel: formatCompactUsd(usdGoal),
    progressPercent: 0,
    countdownTarget: null,
    currentStage: 0,
    isSaleActive: false,
    fromContract: false,
    tokenPriceUsd: null,
    tokenPriceLabel: '',
  }
}

function readCachedStats() {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    return { ...createFallbackStats(), ...parsed, loading: false, fromContract: true }
  } catch {
    return null
  }
}

function writeCachedStats(stats) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        statusLabel: stats.statusLabel,
        statusTone: stats.statusTone,
        raisedUsd: stats.raisedUsd,
        raisedLabel: stats.raisedLabel,
        goalLabel: stats.goalLabel,
        progressPercent: stats.progressPercent,
        countdownTarget: stats.countdownTarget,
        currentStage: stats.currentStage,
        isSaleActive: stats.isSaleActive,
        tokenPriceUsd: stats.tokenPriceUsd,
        tokenPriceLabel: stats.tokenPriceLabel,
      }),
    )
  } catch {
    /* ignore quota / private mode */
  }
}

let statsSnapshot = readCachedStats() ?? createFallbackStats()

function emitStatsChange() {
  listeners.forEach((listener) => listener())
}

function subscribeStats(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getStatsSnapshot() {
  return statsSnapshot
}

function setStatsSnapshot(next) {
  statsSnapshot = next
  if (next.fromContract) {
    writeCachedStats(next)
  }
  emitStatsChange()
}

async function fetchPresaleStats() {
  const usdGoal = PRESALE_USD_GOAL

  if (!isPresaleConfigured) {
    const next = { ...createFallbackStats(), loading: false }
    setStatsSnapshot(next)
    return next
  }

  const presaleContract = getPresaleContract()
  if (!presaleContract) {
    const next = {
      ...statsSnapshot,
      loading: false,
      error: 'Presale contract is not configured.',
    }
    setStatsSnapshot(next)
    return next
  }

  try {
    const nowSec = Math.floor(Date.now() / 1000)
    const [isSaleActive, currentStage, startTime, endTime, totalTokensSold, saleTokenDecimals, tokenPriceUsd] =
      await Promise.all([
        readContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'isSaleActive',
        }),
        readContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'currentStage',
        }),
        readContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'startTime',
        }),
        readContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'endTime',
        }),
        readContract(wagmiConfig, {
          ...presaleContract,
          abi: presaleAbiExport,
          functionName: 'totalTokensSold',
        }),
        readSaleTokenDecimals(presaleContract),
        readPresaleTokenPriceUsd(),
      ])

    const stageNum = Number(currentStage)
    const tokensSold = Number(formatTokenAmount(totalTokensSold, saleTokenDecimals))
    const priceUsd = Number(tokenPriceUsd)
    const raisedUsd =
      Number.isFinite(tokensSold) && tokensSold > 0 && Number.isFinite(priceUsd) && priceUsd > 0
        ? Math.max(0, tokensSold * priceUsd)
        : 0
    const progressPercent = Math.min(100, (raisedUsd / usdGoal) * 100)
    const startSec = Number(startTime)
    const endSec = Number(endTime)
    const countdownTarget =
      endSec > 0
        ? new Date(endSec * 1000).toISOString()
        : startSec > nowSec
          ? new Date(startSec * 1000).toISOString()
          : null

    const saleStatus = resolveSaleStatus({
      isSaleActive,
      startTime: startSec,
      endTime: endSec,
      nowSec,
    })

    const next = {
      loading: false,
      error: '',
      statusLabel: saleStatus.label,
      statusTone: saleStatus.tone,
      raisedUsd,
      raisedLabel: formatCompactUsd(raisedUsd),
      goalLabel: formatCompactUsd(usdGoal),
      progressPercent,
      countdownTarget,
      currentStage: stageNum,
      isSaleActive,
      fromContract: true,
      tokenPriceUsd: Number.isFinite(priceUsd) && priceUsd > 0 ? priceUsd : null,
      tokenPriceLabel: formatUsdTokenPriceLabel(priceUsd),
    }
    setStatsSnapshot(next)
    return next
  } catch (error) {
    const next = {
      ...statsSnapshot,
      loading: false,
      error: error?.message || 'Could not load presale data from contract.',
    }
    setStatsSnapshot(next)
    return next
  }
}

export function prefetchPresaleStats() {
  if (!isPresaleConfigured || inflightPromise) {
    return inflightPromise
  }
  inflightPromise = fetchPresaleStats().finally(() => {
    inflightPromise = null
  })
  return inflightPromise
}

if (isPresaleConfigured) {
  prefetchPresaleStats()
}

export function usePresaleStats() {
  const stats = useSyncExternalStore(subscribeStats, getStatsSnapshot, getStatsSnapshot)

  const refresh = useCallback(() => prefetchPresaleStats(), [])

  useEffect(() => {
    prefetchPresaleStats()
    if (!isPresaleConfigured) {
      return undefined
    }
    const timerId = window.setInterval(() => prefetchPresaleStats(), REFRESH_MS)
    return () => window.clearInterval(timerId)
  }, [])

  return { ...stats, refresh, isPresaleConfigured }
}
