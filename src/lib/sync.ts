import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

const PENDING_QUEUE_KEY = "plantoes-sync-pending-v1"
const LAST_SYNCED_KEY = "plantoes-sync-last-v1"

export type SyncPayload = {
  locations: string[]
  shifts: unknown[]
  shiftTemplates: unknown[]
}

export type RemoteSnapshot = {
  payload: SyncPayload
  updatedAt: string | null
}

export type SyncStatus =
  | "idle"
  | "loading"
  | "syncing"
  | "synced"
  | "offline"
  | "error"

type PendingRecord = {
  payload: SyncPayload
  queuedAt: string
}

function safeJSONParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function readPending(userId: string): PendingRecord | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(`${PENDING_QUEUE_KEY}:${userId}`)
  return safeJSONParse<PendingRecord>(raw)
}

function writePending(userId: string, record: PendingRecord | null) {
  if (typeof window === "undefined") return
  const key = `${PENDING_QUEUE_KEY}:${userId}`
  if (!record) {
    window.localStorage.removeItem(key)
  } else {
    window.localStorage.setItem(key, JSON.stringify(record))
  }
}

function readLastSynced(userId: string): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(`${LAST_SYNCED_KEY}:${userId}`)
}

function writeLastSynced(userId: string, iso: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(`${LAST_SYNCED_KEY}:${userId}`, iso)
}

function normalize(value: Partial<SyncPayload> | null | undefined): SyncPayload {
  return {
    locations: Array.isArray(value?.locations) ? value!.locations : [],
    shifts: Array.isArray(value?.shifts) ? value!.shifts : [],
    shiftTemplates: Array.isArray(value?.shiftTemplates)
      ? value!.shiftTemplates
      : [],
  }
}

export async function loadAppData(
  userId: string,
): Promise<RemoteSnapshot> {
  const { data, error } = await supabase
    .from("app_data")
    .select("data, updated_at")
    .eq("id", userId)
    .maybeSingle()

  if (error) throw error

  return {
    payload: normalize((data?.data ?? {}) as Partial<SyncPayload>),
    updatedAt: data?.updated_at ?? null,
  }
}

export async function pushAppData(
  userId: string,
  payload: SyncPayload,
): Promise<string> {
  const updatedAt = new Date().toISOString()
  const { error } = await supabase.from("app_data").upsert({
    id: userId,
    data: payload as never,
    updated_at: updatedAt,
  })

  if (error) throw error
  writeLastSynced(userId, updatedAt)
  return updatedAt
}

export type UseAppSync = {
  status: SyncStatus
  lastSyncedAt: string | null
  pendingCount: number
  error: string | null
  syncNow: () => Promise<void>
  /** Called once when remote data is loaded. */
  onLoaded: (remote: SyncPayload, updatedAt: string | null) => void
  /** Track local snapshot for autosave. */
  trackLocal: (payload: SyncPayload) => void
}

type Options = {
  enabled: boolean
  userId: string | null
  onRemoteData: (remote: SyncPayload, updatedAt: string | null) => void
}

export function useAppSync({ enabled, userId, onRemoteData }: Options) {
  const [status, setStatus] = useState<SyncStatus>("idle")
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)
  const latestPayloadRef = useRef<SyncPayload | null>(null)
  const inFlightRef = useRef(false)
  const debounceRef = useRef<number | null>(null)
  const onRemoteRef = useRef(onRemoteData)

  useEffect(() => {
    onRemoteRef.current = onRemoteData
  }, [onRemoteData])

  // Reset on user change
  useEffect(() => {
    hasLoadedRef.current = false
    latestPayloadRef.current = null
    setStatus("idle")
    setError(null)
    if (userId) {
      setLastSyncedAt(readLastSynced(userId))
      setPendingCount(readPending(userId) ? 1 : 0)
    } else {
      setLastSyncedAt(null)
      setPendingCount(0)
    }
  }, [userId])

  const flush = useCallback(
    async (payload: SyncPayload) => {
      if (!userId) return
      if (inFlightRef.current) return
      inFlightRef.current = true
      setStatus("syncing")
      setError(null)
      try {
        const updatedAt = await pushAppData(userId, payload)
        writePending(userId, null)
        setPendingCount(0)
        setLastSyncedAt(updatedAt)
        setStatus("synced")
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Falha ao sincronizar"
        // Persist pending snapshot so it survives reloads
        writePending(userId, {
          payload,
          queuedAt: new Date().toISOString(),
        })
        setPendingCount(1)
        setError(message)
        setStatus(
          typeof navigator !== "undefined" && !navigator.onLine
            ? "offline"
            : "error",
        )
      } finally {
        inFlightRef.current = false
      }
    },
    [userId],
  )

  // Initial load
  useEffect(() => {
    if (!enabled || !userId) return
    let cancelled = false
    setStatus("loading")
    setError(null)
    loadAppData(userId)
      .then((snapshot) => {
        if (cancelled) return
        hasLoadedRef.current = true
        onRemoteRef.current(snapshot.payload, snapshot.updatedAt)
        if (snapshot.updatedAt) setLastSyncedAt(snapshot.updatedAt)
        // If there's a pending record, try to flush it now
        const pending = readPending(userId)
        if (pending) {
          void flush(pending.payload)
        } else {
          setStatus("synced")
        }
      })
      .catch((err) => {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : "Falha ao carregar"
        setError(message)
        setStatus(
          typeof navigator !== "undefined" && !navigator.onLine
            ? "offline"
            : "error",
        )
        // Still allow autosaves; treat as not-yet-loaded so we don't overwrite
        // remote data with empty local state on transient failures.
        const pending = readPending(userId)
        setPendingCount(pending ? 1 : 0)
      })
    return () => {
      cancelled = true
    }
  }, [enabled, userId, flush])

  // Track local state changes and debounce-push
  const trackLocal = useCallback(
    (payload: SyncPayload) => {
      latestPayloadRef.current = payload
      if (!enabled || !userId || !hasLoadedRef.current) return
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        void flush(payload)
      }, 400)
    },
    [enabled, userId, flush],
  )

  // Retry on regain network / tab visibility
  useEffect(() => {
    if (!enabled || !userId) return
    const retry = () => {
      const pending = readPending(userId)
      if (!pending) return
      void flush(pending.payload)
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") retry()
    }
    window.addEventListener("online", retry)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("online", retry)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [enabled, userId, flush])

  const syncNow = useCallback(async () => {
    if (!userId) return
    const payload =
      latestPayloadRef.current ?? readPending(userId)?.payload ?? null
    if (!payload) {
      setStatus("synced")
      return
    }
    await flush(payload)
  }, [userId, flush])

  return useMemo(
    () => ({
      status,
      lastSyncedAt,
      pendingCount,
      error,
      syncNow,
      trackLocal,
    }),
    [status, lastSyncedAt, pendingCount, error, syncNow, trackLocal],
  )
}
