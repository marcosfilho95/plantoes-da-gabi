import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export type ThemeName = "rose" | "blue"
const THEME_KEY = "plantoes-gabi:theme"

export function getStoredTheme(): ThemeName {
  if (typeof window === "undefined") return "rose"
  const v = window.localStorage.getItem(THEME_KEY)
  return v === "blue" ? "blue" : "rose"
}

export function applyTheme(theme: ThemeName) {
  if (typeof document === "undefined") return
  document.documentElement.dataset.theme = theme
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

const ORBS: Record<
  ThemeName,
  { label: string; fill: string; glow: string; ring: string }
> = {
  rose: {
    label: "Rose",
    fill: "radial-gradient(circle at 32% 30%, #fda4af 0%, #e86a82 55%, #b23253 100%)",
    glow: "0 0 0 1px rgba(232,106,130,0.18), 0 6px 14px -4px rgba(178,50,83,0.45)",
    ring: "ring-[#e8a2a2]",
  },
  blue: {
    label: "Azul pastel",
    fill: "radial-gradient(circle at 32% 30%, #bfdcf2 0%, #6fa6cf 55%, #2f5d86 100%)",
    glow: "0 0 0 1px rgba(111,166,207,0.18), 0 6px 14px -4px rgba(47,93,134,0.45)",
    ring: "ring-[#90b4ce]",
  },
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
  const cell = size === "sm" ? "size-7" : "size-8"
  const orb = size === "sm" ? "size-4" : "size-[18px]"
  return (
    <div
      role="radiogroup"
      aria-label="Tema de cores"
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-white/70 p-1 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.06)] backdrop-blur-sm",
        className,
      )}
    >
      {(Object.keys(ORBS) as ThemeName[]).map((key) => {
        const active = theme === key
        const o = ORBS[key]
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Tema ${o.label}`}
            title={o.label}
            onClick={() => onChange(key)}
            className={cn(
              "group relative inline-flex items-center justify-center rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              cell,
              active
                ? "bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
                : "hover:bg-white/60",
            )}
          >
            <span
              className={cn(
                "relative block rounded-full transition-all duration-300",
                orb,
                active
                  ? "scale-100 opacity-100"
                  : "scale-90 opacity-60 group-hover:opacity-90 group-hover:scale-95",
              )}
              style={{
                background: o.fill,
                boxShadow: active
                  ? `${o.glow}, inset 0 1px 1px rgba(255,255,255,0.55), inset 0 -2px 3px rgba(0,0,0,0.12)`
                  : "inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.08)",
              }}
            >
              {/* specular highlight */}
              <span
                aria-hidden
                className="pointer-events-none absolute left-[18%] top-[14%] size-1.5 rounded-full bg-white/70 blur-[1px]"
              />
              {/* crescent shadow — feels celestial */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-[2px] -top-[1px] block size-full rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 75% 35%, transparent 55%, rgba(0,0,0,0.18) 78%)",
                  mixBlendMode: "multiply",
                }}
              />
            </span>
            {active && (
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-0 rounded-full ring-1 ring-offset-1 ring-offset-white",
                  o.ring,
                )}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
