// Heurística simples de Dr./Dra. para nomes brasileiros.
// Regra base: nomes terminados em "a" → feminino; demais → masculino.
// Exceções comuns (masculinos terminados em "a" ou ambíguos).

const MASCULINE_ENDING_A = new Set([
  "luca",
  "costa",
  "joshua",
  "noa",
  "elia",
  "isaia",
  "ezequia",
  "matia",
  "aleksa",
  "nikola",
  "andrea", // ambíguo, mas mais comum masculino na origem italiana — pode ser ajustado no perfil
])

export type TitlePref = "auto" | "dr" | "dra" | "none"
export type Title = "Dr." | "Dra." | null

export function detectTitleFromName(fullName: string | undefined | null): Title {
  if (!fullName) return null
  const first = fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? ""
  if (!first) return null
  if (MASCULINE_ENDING_A.has(first)) return "Dr."
  return /a$/.test(first) ? "Dra." : "Dr."
}

const KEY = "plantoes-gabi:title-pref:"

export function getTitlePref(userId: string | undefined | null): TitlePref {
  if (!userId || typeof window === "undefined") return "auto"
  try {
    const v = window.localStorage.getItem(`${KEY}${userId}`)
    if (v === "dr" || v === "dra" || v === "none" || v === "auto") return v
  } catch {}
  return "auto"
}

export function setTitlePref(userId: string, pref: TitlePref) {
  try {
    window.localStorage.setItem(`${KEY}${userId}`, pref)
  } catch {}
}

export function resolveTitle(
  fullName: string | undefined | null,
  pref: TitlePref,
): Title {
  if (pref === "dr") return "Dr."
  if (pref === "dra") return "Dra."
  if (pref === "none") return null
  return detectTitleFromName(fullName)
}
