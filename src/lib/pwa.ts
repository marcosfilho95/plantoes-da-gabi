/**
 * Service worker registration wrapper.
 *
 * Guards: never registers in dev, Lovable preview, iframes, or when ?sw=off.
 * Cleans up any matching registration in refused contexts.
 *
 * Calls onUpdate when a fresh worker has taken control, so the app can toast
 * "nova versão carregada".
 */
type Options = {
  onUpdate?: () => void
}

const SW_PATH = "/sw.js"

function hostnameRefuses(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  )
}

function isRefusedContext() {
  if (typeof window === "undefined") return true
  if (!import.meta.env.PROD) return true
  try {
    if (window.self !== window.top) return true
  } catch {
    return true
  }
  const url = new URL(window.location.href)
  if (url.searchParams.get("sw") === "off") return true
  if (hostnameRefuses(window.location.hostname)) return true
  return false
}

async function unregisterMatching() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return
  }
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      regs
        .filter((reg) => {
          const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? ""
          return url.endsWith(SW_PATH) || url.endsWith("/service-worker.js")
        })
        .map((reg) => reg.unregister()),
    )
  } catch {
    /* ignore */
  }
}

export async function registerServiceWorker({ onUpdate }: Options = {}) {
  if (isRefusedContext()) {
    await unregisterMatching()
    return
  }
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return
  }

  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" })

    // When a new SW takes control after the initial load, signal an update.
    let hadController = Boolean(navigator.serviceWorker.controller)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController) onUpdate?.()
      hadController = true
    })

    // Periodically poll for updates so installed apps refresh in background.
    setInterval(() => {
      reg.update().catch(() => {})
    }, 60 * 60 * 1000)
  } catch (error) {
    console.warn("[sw] register failed", error)
  }
}
