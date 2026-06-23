import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

export type ThemeName = "light" | "dark"
const THEME_KEY = "plantoes-gabi:theme"

export function getStoredTheme(): ThemeName {
  if (typeof window === "undefined") return "light"
  const v = window.localStorage.getItem(THEME_KEY)
  // Migrate legacy values (rose/blue) → light
  return v === "dark" ? "dark" : "light"
}

export function applyTheme(theme: ThemeName) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme === "dark" ? "dark" : "light"
}

type DocWithVT = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> }
}

export function changeThemeWithBlob(
  current: ThemeName,
  next: ThemeName,
  origin: { x: number; y: number } | null,
  commit: (t: ThemeName) => void,
) {
  if (current === next) return
  const doc = document as DocWithVT
  const root = document.documentElement
  if (origin) {
    root.style.setProperty("--theme-x", `${origin.x}px`)
    root.style.setProperty("--theme-y", `${origin.y}px`)
  } else {
    root.style.setProperty("--theme-x", "50%")
    root.style.setProperty("--theme-y", "50%")
  }
  if (
    typeof doc.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    commit(next)
    return
  }
  doc.startViewTransition(() => commit(next))
}

export function useTheme(): [ThemeName, (t: ThemeName) => void] {
  const [theme, setTheme] = useState<ThemeName>(() => getStoredTheme())
  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(THEME_KEY, theme)
    } catch {}
  }, [theme])
  return [theme, setTheme]
}

export function ThemeToggle({
  theme,
  onChange,
  className = "",
  size = "md",
}: {
  theme: ThemeName
  onChange: (t: ThemeName) => void
  className?: string
  size?: "sm" | "md"
}) {
  const isDark = theme === "dark"
  const next: ThemeName = isDark ? "light" : "dark"
  const dims = size === "sm" ? "h-8 w-[60px]" : "h-9 w-[68px]"
  const knob = size === "sm" ? "size-6" : "size-7"
  const icon = size === "sm" ? "size-3.5" : "size-4"
  const shift = size === "sm" ? "translate-x-[28px]" : "translate-x-[31px]"

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      onClick={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
        changeThemeWithBlob(
          theme,
          next,
          { x: r.left + r.width / 2, y: r.top + r.height / 2 },
          onChange,
        )
      }}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border p-0.5 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        dims,
        isDark
          ? "border-white/10 bg-[linear-gradient(135deg,#1b2236_0%,#0c1020_100%)]"
          : "border-border/70 bg-[linear-gradient(135deg,#fff_0%,#fde7ec_100%)]",
        className,
      )}
    >
      {/* Background icons (always visible, fade with theme) */}
      <Sun
        className={cn(
          "absolute left-1.5 size-3.5 transition-opacity duration-300",
          isDark ? "text-white/30 opacity-60" : "text-amber-500 opacity-0",
        )}
        aria-hidden
      />
      <Moon
        className={cn(
          "absolute right-1.5 size-3.5 transition-opacity duration-300",
          isDark ? "text-white/0 opacity-0" : "text-slate-400 opacity-70",
        )}
        aria-hidden
      />

      {/* Knob */}
      <span
        className={cn(
          "relative z-10 inline-flex items-center justify-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.55)] transition-all duration-500 ease-out",
          knob,
          isDark
            ? cn(shift, "bg-[radial-gradient(circle_at_30%_30%,#f5f3ff_0%,#cbd5e1_60%,#64748b_100%)]")
            : "translate-x-0 bg-[radial-gradient(circle_at_30%_30%,#fff7ed_0%,#fcd34d_55%,#f59e0b_100%)]",
        )}
      >
        {isDark ? (
          <Moon className={cn(icon, "text-slate-700")} strokeWidth={2.2} />
        ) : (
          <Sun className={cn(icon, "text-amber-700")} strokeWidth={2.4} />
        )}
      </span>
    </button>
  )
}
