/**
 * CSV utilities for exporting Shift records.
 *
 * Output format (Excel-friendly, pt-BR):
 *  - UTF-8 with BOM (\ufeff) so Excel detects encoding
 *  - Separator: ";"
 *  - Every cell wrapped in double quotes, internal quotes doubled
 *  - Dates rendered as dd/mm/aaaa
 *  - Decimal values use comma (",") and no thousand separators
 *
 * Contabilidade:
 *  - data_plantao  -> produção médica (competência)
 *  - data_recebimento -> financeiro / ano-calendário
 *  - valor_bruto -> valor combinado do plantão
 *  - valor_liquido -> apenas o efetivamente recebido (vazio se pendente)
 *  - desconto_ou_ajuste -> valor_bruto - valor_liquido (negativo = adicional)
 */

export type CsvShift = {
  id: string
  date: string
  location: string
  kind: string
  period?: string
  paid: boolean
  amount?: number
  expectedPaymentDate?: string
  paymentDate?: string
  netAmount?: number
  deductions?: number
  calculatedDifference?: number
  invoiceNumber?: string
  paymentNotes?: string
  notes?: string
  personType?: "PF" | "PJ"
}

export type PersonScope = "todos" | "PF" | "PJ"

export const CSV_HEADER = [
  "id",
  "data_plantao",
  "mes_competencia",
  "local",
  "turno",
  "horario",
  "tipo_recebimento",
  "status",
  "valor_bruto",
  "data_prevista_recebimento",
  "data_recebimento",
  "mes_recebimento",
  "ano_calendario_recebimento",
  "valor_liquido",
  "desconto_ou_ajuste",
  "diferenca_calculada",
  "numero_nota_fiscal",
  "observacoes",
] as const

const SEPARATOR = ";"
const LINE_BREAK = "\r\n"

export function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value)
  return `"${str.replaceAll('"', '""')}"`
}

export function formatCsvDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return iso
  return `${match[3]}/${match[2]}/${match[1]}`
}

export function formatCsvAmount(value: number | undefined): string {
  if (value === undefined || value === null || Number.isNaN(value)) return ""
  return value.toFixed(2).replace(".", ",")
}

function formatMonthKey(iso: string | undefined): string {
  if (!iso) return ""
  const match = /^(\d{4})-(\d{2})/.exec(iso)
  return match ? `${match[1]}-${match[2]}` : ""
}

function formatYearKey(iso: string | undefined): string {
  if (!iso) return ""
  const match = /^(\d{4})/.exec(iso)
  return match ? match[1] : ""
}

function computeAdjustment(shift: CsvShift): number | undefined {
  if (!shift.paid) return undefined
  if (shift.amount === undefined || shift.netAmount === undefined) return undefined
  return Number((shift.amount - shift.netAmount).toFixed(2))
}

function shiftRow(shift: CsvShift): string[] {
  const paymentDate = shift.paid ? shift.paymentDate : undefined
  const netAmount = shift.paid ? shift.netAmount : undefined
  const adjustment = computeAdjustment(shift)
  return [
    shift.id,
    formatCsvDate(shift.date),
    formatMonthKey(shift.date),
    shift.location,
    shift.kind,
    shift.period ?? "",
    shift.personType ?? "",
    shift.paid ? "recebido" : "pendente",
    formatCsvAmount(shift.amount),
    shift.expectedPaymentDate ? formatCsvDate(shift.expectedPaymentDate) : "",
    paymentDate ? formatCsvDate(paymentDate) : "",
    formatMonthKey(paymentDate),
    formatYearKey(paymentDate),
    formatCsvAmount(netAmount),
    formatCsvAmount(adjustment),
    formatCsvAmount(shift.calculatedDifference),
    shift.invoiceNumber ?? "",
    [shift.notes, shift.paymentNotes].filter(Boolean).join(" | "),
  ]
}

export type BuildCsvOptions = {
  header?: readonly string[]
}

export function buildShiftsCsv(
  shifts: CsvShift[],
  options: BuildCsvOptions = {},
): string {
  const header = options.header ?? CSV_HEADER
  const lines: string[] = []
  lines.push(header.map(escapeCsvCell).join(SEPARATOR))
  for (const shift of shifts) {
    lines.push(shiftRow(shift).map(escapeCsvCell).join(SEPARATOR))
  }
  return lines.join(LINE_BREAK)
}

// ===== Summary =====

export type ShiftsSummary = {
  brutoPorCompetencia: Array<{ mes: string; total: number; quantidade: number }>
  liquidoPorRecebimento: Array<{ mes: string; total: number; quantidade: number }>
  pendente: { total: number; quantidade: number }
  porLocal: Array<{ local: string; bruto: number; liquido: number; quantidade: number }>
  porTipoRecebimento: Array<{
    tipo: string
    bruto: number
    liquido: number
    quantidade: number
  }>
}

function addTo<K extends string>(
  map: Map<string, { total: number; quantidade: number }>,
  key: K,
  value: number,
) {
  const cur = map.get(key) ?? { total: 0, quantidade: 0 }
  cur.total += value
  cur.quantidade += 1
  map.set(key, cur)
}

export function buildShiftsSummary(shifts: CsvShift[]): ShiftsSummary {
  const brutoMap = new Map<string, { total: number; quantidade: number }>()
  const liquidoMap = new Map<string, { total: number; quantidade: number }>()
  const localMap = new Map<
    string,
    { bruto: number; liquido: number; quantidade: number }
  >()
  const tipoMap = new Map<
    string,
    { bruto: number; liquido: number; quantidade: number }
  >()
  let pendenteTotal = 0
  let pendenteQtd = 0

  for (const shift of shifts) {
    const bruto = shift.amount ?? 0
    const liquido = shift.paid ? shift.netAmount ?? 0 : 0
    const mesComp = formatMonthKey(shift.date)
    if (mesComp) addTo(brutoMap, mesComp, bruto)

    if (shift.paid) {
      const mesReceb = formatMonthKey(shift.paymentDate)
      if (mesReceb) addTo(liquidoMap, mesReceb, liquido)
    } else {
      pendenteTotal += bruto
      pendenteQtd += 1
    }

    const localKey = shift.location || "(sem local)"
    const localCur = localMap.get(localKey) ?? {
      bruto: 0,
      liquido: 0,
      quantidade: 0,
    }
    localCur.bruto += bruto
    localCur.liquido += liquido
    localCur.quantidade += 1
    localMap.set(localKey, localCur)

    const tipoKey = shift.personType ?? "(indefinido)"
    const tipoCur = tipoMap.get(tipoKey) ?? {
      bruto: 0,
      liquido: 0,
      quantidade: 0,
    }
    tipoCur.bruto += bruto
    tipoCur.liquido += liquido
    tipoCur.quantidade += 1
    tipoMap.set(tipoKey, tipoCur)
  }

  const sortByKey = <T extends { [k: string]: unknown }>(
    arr: T[],
    key: keyof T,
  ) => arr.sort((a, b) => String(a[key]).localeCompare(String(b[key])))

  return {
    brutoPorCompetencia: sortByKey(
      Array.from(brutoMap.entries()).map(([mes, v]) => ({ mes, ...v })),
      "mes",
    ),
    liquidoPorRecebimento: sortByKey(
      Array.from(liquidoMap.entries()).map(([mes, v]) => ({ mes, ...v })),
      "mes",
    ),
    pendente: { total: pendenteTotal, quantidade: pendenteQtd },
    porLocal: sortByKey(
      Array.from(localMap.entries()).map(([local, v]) => ({ local, ...v })),
      "local",
    ),
    porTipoRecebimento: sortByKey(
      Array.from(tipoMap.entries()).map(([tipo, v]) => ({ tipo, ...v })),
      "tipo",
    ),
  }
}

export function buildSummaryCsv(shifts: CsvShift[]): string {
  const s = buildShiftsSummary(shifts)
  const lines: string[] = []
  const row = (cells: unknown[]) =>
    lines.push(cells.map(escapeCsvCell).join(SEPARATOR))

  row(["secao", "chave", "quantidade", "valor_bruto", "valor_liquido"])

  for (const item of s.brutoPorCompetencia) {
    row([
      "total_bruto_por_mes_competencia",
      item.mes,
      item.quantidade,
      formatCsvAmount(item.total),
      "",
    ])
  }
  for (const item of s.liquidoPorRecebimento) {
    row([
      "total_liquido_por_mes_recebimento",
      item.mes,
      item.quantidade,
      "",
      formatCsvAmount(item.total),
    ])
  }
  row([
    "total_pendente",
    "",
    s.pendente.quantidade,
    formatCsvAmount(s.pendente.total),
    "",
  ])
  for (const item of s.porLocal) {
    row([
      "total_por_local",
      item.local,
      item.quantidade,
      formatCsvAmount(item.bruto),
      formatCsvAmount(item.liquido),
    ])
  }
  for (const item of s.porTipoRecebimento) {
    row([
      "total_por_tipo_recebimento",
      item.tipo,
      item.quantidade,
      formatCsvAmount(item.bruto),
      formatCsvAmount(item.liquido),
    ])
  }

  return lines.join(LINE_BREAK)
}

export type DownloadCsvOptions = BuildCsvOptions & {
  filenameBase?: string
  label?: string
  personScope?: PersonScope
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

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([`\ufeff${csv}`], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.rel = "noopener"
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadShiftsCsv(
  shifts: CsvShift[],
  options: DownloadCsvOptions = {},
): string {
  const csv = buildShiftsCsv(shifts, options)
  const filename = buildCsvFilename(options)
  triggerDownload(csv, filename)

  // Resumo contábil separado, com sufixo "-resumo".
  const summaryCsv = buildSummaryCsv(shifts)
  const baseName = filename.replace(/\.csv$/i, "")
  triggerDownload(summaryCsv, `${baseName}-resumo.csv`)

  return filename
}

export type YearValidation =
  | { ok: true; year: number }
  | { ok: false; message: string }

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
