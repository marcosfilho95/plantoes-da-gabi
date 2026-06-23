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

const SWATCHES: Record<ThemeName, { label: string; gradient: string }> = {
  rose: {
    label: "Rose",
    gradient: "linear-gradient(135deg, hsl(350 89% 60%), hsl(345 75% 38%))",
  },
  blue: {
    label: "Azul pastel",
    gradient: "linear-gradient(135deg, hsl(205 90% 62%), hsl(222 70% 40%))",
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
  const dotSize = size === "sm" ? "size-5" : "size-6"
  return (
    <div
      role="radiogroup"
      aria-label="Tema de cores"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-white/80 p-1 shadow-sm backdrop-blur",
        className,
      )}
    >
      {(Object.keys(SWATCHES) as ThemeName[]).map((key) => {
        const active = theme === key
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Tema ${SWATCHES[key].label}`}
            title={SWATCHES[key].label}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex items-center justify-center rounded-full transition-all",
              dotSize,
              active
                ? "ring-2 ring-primary ring-offset-1 ring-offset-white"
                : "opacity-70 hover:opacity-100",
            )}
            style={{ background: SWATCHES[key].gradient }}
          />
        )
      })}
    </div>
  )
}
