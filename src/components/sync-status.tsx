import { useEffect, useState } from "react"
import {
  CheckCircle2,
  CloudOff,
  Loader2,
  RefreshCw,
  WifiOff,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SyncStatus as SyncStatusValue } from "@/lib/sync"

function formatRelative(iso: string | null) {
  if (!iso) return "ainda não sincronizado"
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return "—"
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "agora mesmo"
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days} d`
  return new Date(iso).toLocaleDateString("pt-BR")
}

type Props = {
  status: SyncStatusValue
  lastSyncedAt: string | null
  pendingCount: number
  error: string | null
  onSyncNow: () => void
  className?: string
}

export function SyncStatus({
  status,
  lastSyncedAt,
  pendingCount,
  error,
  onSyncNow,
  className,
}: Props) {
  // Force re-render every minute so "há X min" stays fresh
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const isProblem =
    status === "error" || status === "offline" || pendingCount > 0

  const config = (() => {
    if (status === "syncing" || status === "loading") {
      return {
        Icon: Loader2,
        iconClass: "animate-spin text-primary",
        label: "Sincronizando…",
        tone: "neutral" as const,
      }
    }
    if (status === "offline") {
      return {
        Icon: WifiOff,
        iconClass: "text-amber-600",
        label: "Sem conexão — alterações na fila",
        tone: "warn" as const,
      }
    }
    if (status === "error" || pendingCount > 0) {
      return {
        Icon: CloudOff,
        iconClass: "text-amber-600",
        label:
          pendingCount > 0
            ? "Alterações pendentes de sincronização"
            : "Falha ao sincronizar",
        tone: "warn" as const,
      }
    }
    return {
      Icon: CheckCircle2,
      iconClass: "text-emerald-600",
      label: "Sincronizado com o Supabase",
      tone: "ok" as const,
    }
  })()

  const Icon = config.Icon

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs shadow-sm",
        config.tone === "ok" &&
          "border-emerald-200/70 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100",
        config.tone === "warn" &&
          "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100",
        config.tone === "neutral" &&
          "border-border bg-card text-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={cn("size-4 shrink-0", config.iconClass)} aria-hidden />
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{config.label}</p>
          <p className="truncate text-[11px] opacity-80">
            Último backup: {formatRelative(lastSyncedAt)}
            {error && status !== "synced" ? ` · ${error}` : ""}
          </p>
        </div>
      </div>
      {isProblem ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onSyncNow}
          disabled={status === "syncing"}
          className="h-7 shrink-0 gap-1.5 px-2.5 text-[11px]"
        >
          <RefreshCw className="size-3" aria-hidden />
          Sincronizar agora
        </Button>
      ) : null}
    </div>
  )
}
