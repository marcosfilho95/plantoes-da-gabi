/**
 * CSV utilities for exporting Shift records.
 *
 * Output format (Excel-friendly, pt-BR):
 *  - UTF-8 with BOM (\ufeff) so Excel detects encoding
 *  - Separator: ";"
 *  - Every cell wrapped in double quotes, internal quotes doubled
 *  - Dates rendered as dd/mm/aaaa
 *  - Decimal values use comma (",") and no thousand separators
 *  - A final TOTAL row sums the "valor" column
 *
 * Manual verification (steps):
 *  1. Open the app, navigate to month with shifts.
 *  2. Apply filters (status, local, turno, PF/PJ) on the Plantões tab.
 *  3. Click "Todos" / "PF" / "PJ" export buttons — confirm filename and rows.
 *  4. Open CSV in Excel/LibreOffice; confirm header, dates, comma decimals
 *     and TOTAL row matching displayed total.
 *  5. In the yearly export, try a future year and a non-4-digit value —
 *     expect a friendly error and no download.
 *  6. Try a notes field containing  " ; \n  — expect escaped output.
 */

export type CsvShift = {
  date: string
  location: string
  kind: string
  period?: string
  paid: boolean
  amount?: number
  notes?: string
  personType?: "PF" | "PJ"
}

export type PersonScope = "todos" | "PF" | "PJ"

export const CSV_HEADER = [
  "data",
  "local",
  "turno",
  "horario",
  "tipo",
  "recebido",
  "valor",
  "observacoes",
] as const

const SEPARATOR = ";"
const LINE_BREAK = "\r\n"

export function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value)
  return `"${str.replaceAll('"', '""')}"`
}

export function formatCsvDate(iso: string): string {
  // iso is YYYY-MM-DD
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return iso
  return `${match[3]}/${match[2]}/${match[1]}`
}

export function formatCsvAmount(value: number | undefined): string {
  if (value === undefined || value === null || Number.isNaN(value)) return ""
  return value.toFixed(2).replace(".", ",")
}

function shiftRow(shift: CsvShift): string[] {
  return [
    formatCsvDate(shift.date),
    shift.location,
    shift.kind,
    shift.period ?? "",
    shift.personType ?? "",
    shift.paid ? "sim" : "nao",
    formatCsvAmount(shift.amount),
    shift.notes ?? "",
  ]
}

export type BuildCsvOptions = {
  /** Optional list of header columns. Defaults to CSV_HEADER. */
  header?: readonly string[]
  /** When false, omit the trailing TOTAL row. Defaults to true. */
  includeTotal?: boolean
  /** Label printed in the "data" column of the TOTAL row. */
  totalLabel?: string
}

/** Builds the CSV body (without BOM). Returns at least header + total row. */
export function buildShiftsCsv(
  shifts: CsvShift[],
  options: BuildCsvOptions = {},
): string {
  const header = options.header ?? CSV_HEADER
  const includeTotal = options.includeTotal !== false
  const lines: string[] = []

  lines.push(header.map(escapeCsvCell).join(SEPARATOR))

  for (const shift of shifts) {
    lines.push(shiftRow(shift).map(escapeCsvCell).join(SEPARATOR))
  }

  if (includeTotal) {
    const total = shifts.reduce((sum, shift) => sum + (shift.amount ?? 0), 0)
    const totalRow = new Array(header.length).fill("")
    totalRow[0] = options.totalLabel ?? "TOTAL"
    // Place sum in the "valor" column when present
    const valorIndex = header.indexOf("valor")
    const target = valorIndex >= 0 ? valorIndex : header.length - 2
    totalRow[target] = formatCsvAmount(total)
    lines.push(totalRow.map(escapeCsvCell).join(SEPARATOR))
  }

  return lines.join(LINE_BREAK)
}

export type DownloadCsvOptions = BuildCsvOptions & {
  /** Filename prefix, e.g. "plantoes-gabi". */
  filenameBase?: string
  /** Main label segment, e.g. "2026-06" or "2026". */
  label?: string
  /** Suffix derived from person scope. "todos" omits suffix. */
  personScope?: PersonScope
  /** Override the full filename (without extension). */
  filename?: string
}

export function buildCsvFilename(options: DownloadCsvOptions = {}): string {
  if (options.filename) return `${options.filename}.csv`
  const parts: string[] = [options.filenameBase ?? "plantoes-gabi"]
  if (options.label) parts.push(options.label)
  if (options.personScope && options.personScope !== "todos") {
    parts.push(options.personScope.toLowerCase())
  }
  return `${parts.join("-")}.csv`
}

/** Builds and triggers a browser download. Returns the filename used. */
export function downloadShiftsCsv(
  shifts: CsvShift[],
  options: DownloadCsvOptions = {},
): string {
  const csv = buildShiftsCsv(shifts, options)
  const blob = new Blob([`\ufeff${csv}`], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const filename = buildCsvFilename(options)

  link.href = url
  link.download = filename
  link.rel = "noopener"
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return filename
}

export type YearValidation =
  | { ok: true; year: number }
  | { ok: false; message: string }

/** Validates a yearly-export input string. */
export function validateExportYear(
  raw: string,
  now: Date = new Date(),
): YearValidation {
  const trimmed = raw.trim()
  if (!/^\d{4}$/.test(trimmed)) {
    return { ok: false, message: "Informe um ano com 4 dígitos." }
  }
  const year = Number(trimmed)
  const currentYear = now.getFullYear()
  if (year > currentYear) {
    return { ok: false, message: "Não é possível exportar um ano futuro." }
  }
  if (year < 2000) {
    return { ok: false, message: "Ano muito antigo. Use 2000 ou posterior." }
  }
  return { ok: true, year }
}
