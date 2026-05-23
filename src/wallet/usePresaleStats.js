import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { readContract } from 'thirdweb'
import { chainId, isPresaleConfigured, presaleContractAddress } from '../contracts/config.js'
import { formatTokenAmount, getPresaleContract, readSaleTokenDecimals } from './presaleContract.js'

const REFRESH_MS = 15_000
const DISPLAY_ACTUAL_PRICE_USD = 0.0007

const CACHE_KEY = `presale-stats:${chainId}:${presaleContractAddress || 'none'}`
const listeners = new Set()
let inflightPromise = null

function envUsdGoal() {
  const raw = (import.meta.env.VITE_PRESALE_USD_GOAL ?? '1000000')
    .toString()
    .replace(/,/g, '')
    .trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 1_000_000
}

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
  const usdGoal = envUsdGoal()
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
  const usdGoal = envUsdGoal()

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
    const [isSaleActive, currentStage, startTime, endTime, totalTokensSold, saleTokenDecimals] =
      await Promise.all([
        readContract({
          contract: presaleContract,
          method: 'function isSaleActive() view returns (bool)',
        }),
        readContract({
          contract: presaleContract,
          method: 'function currentStage() view returns (uint8)',
        }),
        readContract({
          contract: presaleContract,
          method: 'function startTime() view returns (uint256)',
        }),
        readContract({
          contract: presaleContract,
          method: 'function endTime() view returns (uint256)',
        }),
        readContract({
          contract: presaleContract,
          method: 'function totalTokensSold() view returns (uint256)',
        }),
        readSaleTokenDecimals(presaleContract),
      ])

    const stageNum = Number(currentStage)
    const tokensSold = Number(formatTokenAmount(totalTokensSold, saleTokenDecimals))
    const raisedUsd =
      Number.isFinite(tokensSold) && tokensSold > 0
        ? Math.max(0, tokensSold * DISPLAY_ACTUAL_PRICE_USD)
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
