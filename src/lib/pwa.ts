/**
 * Service worker registration wrapper.
 *
 * Guards per the PWA skill: never registers in dev, Lovable preview, iframes,
 * or when ?sw=off is present. Cleans up any matching registration in those
 * refused contexts.
 *
 * Calls onUpdate when a new worker is ready, so the app can prompt the user.
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
    const { Workbox } = await import("workbox-window")
    const wb = new Workbox(SW_PATH, { scope: "/" })

    wb.addEventListener("waiting", () => {
      onUpdate?.()
      // Apply update on next click prompt (skipWaiting from app)
      wb.addEventListener("controlling", () => {
        window.location.reload()
      })
    })

    await wb.register({ immediate: true })
  } catch (error) {
    console.warn("[sw] register failed", error)
  }
}

/** Tell the waiting worker to take control. Called after user accepts update. */
export async function activateWaitingWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return
  }
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH)
  reg?.waiting?.postMessage({ type: "SKIP_WAITING" })
}
