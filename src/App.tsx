import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Filter,
  KeyRound,
  LogIn,
  LogOut,
  MapPin,
  Mail,
  Plus,
  Table2,
  Trash2,
  User,
  UserPlus,
  WalletCards,
} from "lucide-react"
import type { Session } from "@supabase/supabase-js"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { SiteFooter, GoogleLogo } from "@/components/site-footer"
import {
  downloadShiftsCsv,
  type PersonScope,
} from "@/lib/csv"

const STORAGE_KEY = "plantoes-gabi:v1"
const LOCATIONS_STORAGE_KEY = "plantoes-gabi:locations:v1"

const DEFAULT_LOCATIONS: string[] = []

const SHIFT_TYPES = [
  {
    code: "M",
    name: "Manhã",
    period: "07:00-13:00",
    hours: 6,
    start: 7,
    tone: "border-pink-200 bg-pink-50 text-pink-700",
  },
  {
    code: "RM",
    name: "Intermediário Diurno",
    period: "10:00-16:00",
    hours: 6,
    start: 10,
    tone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  },
  {
    code: "T",
    name: "Tarde",
    period: "13:00-19:00",
    hours: 6,
    start: 13,
    tone: "border-orange-200 bg-orange-50 text-orange-700",
  },
  {
    code: "MT",
    name: "Plantão Diurno",
    period: "07:00-19:00",
    hours: 12,
    start: 7,
    tone: "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    code: "RN",
    name: "Noturno Curto",
    period: "19:00-01:00",
    hours: 6,
    start: 19,
    tone: "border-violet-200 bg-violet-50 text-violet-700",
  },
  {
    code: "SN",
    name: "Plantão Noturno",
    period: "19:00-07:00",
    hours: 12,
    start: 19,
    tone: "border-slate-200 bg-slate-50 text-slate-700",
  },
] as const

type ShiftMeta = (typeof SHIFT_TYPES)[number]
type ShiftCode = ShiftMeta["code"]
type PaymentFilter = "todos" | "pendentes" | "recebidos"
type ShiftFilter = "todos" | ShiftCode
type PersonFilter = "todos" | "PF" | "PJ"
type TabId = "agenda" | "plantoes" | "resumo"
type PaymentStatus = "received" | "pending" | "overdue"

type Shift = {
  id: string
  date: string
  location: string
  kind: ShiftCode
  paid: boolean
  amount?: number
  notes?: string
  personType: "PF" | "PJ"
  createdAt: string
  updatedAt?: string
}

type ShiftForm = {
  date: string
  location: string
  kind: ShiftCode
  paid: boolean
  amount: string
  notes: string
  personType: "PF" | "PJ"
}

type AuthSession = {
  email: string
  token: string
  userId: string
  fullName: string
  firstName: string
}

type AuthMode = "login" | "signup" | "recover" | "update-password"

type AuthForm = {
  confirmPassword: string
  email: string
  password: string
  username: string
}

const SHIFT_BY_CODE = Object.fromEntries(
  SHIFT_TYPES.map((shift) => [shift.code, shift]),
) as Record<ShiftCode, ShiftMeta>

const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  received: {
    label: "Recebido",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  pending: {
    label: "Pendente",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  overdue: {
    label: "Atrasado",
    className: "border-red-200 bg-red-50 text-red-700",
  },
}

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
})

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
})

const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
})

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
})

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

function parseISODate(date: string) {
  return new Date(`${date}T12:00:00`)
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function todayISO() {
  return toISODate(new Date())
}

function monthKeyFromDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")

  return `${date.getFullYear()}-${month}`
}

function parseMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)

  return new Date(year, month - 1, 1, 12)
}

function addMonths(monthKey: string, amount: number) {
  const base = parseMonthKey(monthKey)
  base.setMonth(base.getMonth() + amount)

  return monthKeyFromDate(base)
}

function formatMonth(monthKey: string) {
  const formatted = monthFormatter.format(parseMonthKey(monthKey)).replace(" de ", " ")

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function formatShortDate(date: string) {
  return dayFormatter.format(parseISODate(date)).replace(".", "")
}

function formatWeekday(date: string) {
  return weekdayFormatter.format(parseISODate(date)).replace(".", "")
}

function formatFullDate(date: string) {
  const formatted = fullDateFormatter.format(parseISODate(date))

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function formatShiftCount(count: number) {
  return `${count} ${count === 1 ? "plantão" : "plantões"}`
}

function getPaymentStatus(shift: Shift): PaymentStatus {
  return shift.paid ? "received" : "pending"
}

function parseAmount(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed
  const amount = Number(normalized)

  return Number.isFinite(amount) && amount > 0 ? amount : undefined
}

function createId() {
  if ("randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function sortShifts(a: Shift, b: Shift) {
  const dateOrder = a.date.localeCompare(b.date)

  if (dateOrder !== 0) {
    return dateOrder
  }

  return SHIFT_BY_CODE[a.kind].start - SHIFT_BY_CODE[b.kind].start
}

function normalizeLocationName(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase()
}

function mergeLocations(...groups: string[][]) {
  const seen = new Set<string>()
  const merged: string[] = []

  groups.flat().forEach((location) => {
    const normalized = normalizeLocationName(location)

    if (!normalized || seen.has(normalized)) {
      return
    }

    seen.add(normalized)
    merged.push(normalized)
  })

  return merged
}

function readStoredLocations() {
  const raw = window.localStorage.getItem(LOCATIONS_STORAGE_KEY)

  if (!raw) {
    return DEFAULT_LOCATIONS
  }

  try {
    const parsed = JSON.parse(raw) as string[]

    if (!Array.isArray(parsed)) {
      return DEFAULT_LOCATIONS
    }

    return mergeLocations(DEFAULT_LOCATIONS, parsed)
  } catch {
    return DEFAULT_LOCATIONS
  }
}

function sanitizeShifts(value: unknown): Shift[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((shift) => {
    if (!shift || typeof shift !== "object") {
      return []
    }

    const candidate = shift as Partial<Shift>
    const location = normalizeLocationName(String(candidate.location ?? ""))
    const isValid =
      typeof candidate.id === "string" &&
      typeof candidate.date === "string" &&
      location.length > 0 &&
      typeof candidate.kind === "string" &&
      candidate.kind in SHIFT_BY_CODE &&
      typeof candidate.paid === "boolean"

    if (!isValid) {
      return []
    }

    const id = String(candidate.id)
    const date = String(candidate.date)
    const kind = candidate.kind as ShiftCode
    const paid = Boolean(candidate.paid)
    const amount = Number(candidate.amount)
    const notes = typeof candidate.notes === "string" ? candidate.notes : ""
    const personType: "PF" | "PJ" =
      candidate.personType === "PJ" ? "PJ" : "PF"

    return [
      {
        ...candidate,
        id,
        date,
        location,
        kind,
        paid,
        amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
        notes,
        personType,
        createdAt:
          typeof candidate.createdAt === "string"
            ? candidate.createdAt
            : new Date().toISOString(),
        updatedAt:
          typeof candidate.updatedAt === "string" ? candidate.updatedAt : undefined,
      },
    ]
  })
}

function readStoredShifts() {
  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return []
  }

  try {
    return sanitizeShifts(JSON.parse(raw))
  } catch {
    return []
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
) {
  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json")

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`)
  }

  const response = await fetch(path, {
    ...options,
    headers,
  })
  const text = await response.text()
  let payload = {} as T & { error?: string }

  if (text) {
    try {
      payload = JSON.parse(text) as T & { error?: string }
    } catch {
      payload = { error: text } as T & { error?: string }
    }
  }

  if (!response.ok) {
    throw new Error(payload.error ?? text ?? "Não foi possível sincronizar")
  }

  return payload
}

function toAuthSession(session: Session | null): AuthSession | null {
  if (!session?.access_token || !session.user?.id) {
    return null
  }

  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>
  const rawName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.given_name === "string" && meta.given_name) ||
    ""
  const email = session.user.email ?? ""
  const fallback = email.split("@")[0]?.replace(/[._\-+\d]+/g, " ").trim() ?? ""
  const fullName = (rawName || fallback).trim()
  const firstNameRaw = fullName.split(/\s+/)[0] ?? ""
  const firstName = firstNameRaw
    ? firstNameRaw.charAt(0).toLocaleUpperCase("pt-BR") +
      firstNameRaw.slice(1).toLocaleLowerCase("pt-BR")
    : ""

  return {
    email,
    token: session.access_token,
    userId: session.user.id,
    fullName: fullName || email,
    firstName: firstName || (email ? email[0]!.toUpperCase() : "Usuário"),
  }
}

function getAuthRedirectUrl() {
  return window.location.origin
}

function getInitialAuthMode(): AuthMode {
  const hashParams = new URLSearchParams(window.location.hash.slice(1))
  const queryParams = new URLSearchParams(window.location.search)
  const type = hashParams.get("type") ?? queryParams.get("type")

  return type === "recovery" ? "update-password" : "login"
}

function createEmptyAuthForm(): AuthForm {
  return {
    confirmPassword: "",
    email: "",
    password: "",
    username: "",
  }
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, "")
}

function isValidUsername(value: string) {
  return /^[a-z0-9_]{3,24}$/.test(value)
}

function looksLikeEmail(value: string) {
  return value.includes("@")
}

async function resolveAuthEmail(identifier: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase()

  if (looksLikeEmail(normalizedIdentifier)) {
    return normalizedIdentifier
  }

  const username = normalizeUsername(normalizedIdentifier)

  if (!isValidUsername(username)) {
    throw new Error("Informe um e-mail ou usuário válido.")
  }

  const result = await apiRequest<{ email: string }>(
    `/api/auth-identity?identifier=${encodeURIComponent(username)}`,
  )

  return result.email
}

async function registerAuthUsername(email: string, username: string) {
  return apiRequest<{ email: string; username: string }>("/api/auth-profile", {
    method: "POST",
    body: JSON.stringify({ email, username }),
  })
}

function formatAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  if (/Invalid login credentials/i.test(message)) {
    return "E-mail ou senha inválidos."
  }

  if (/Email not confirmed/i.test(message)) {
    return "Confirme seu e-mail antes de entrar."
  }

  if (/User already registered/i.test(message)) {
    return "Este e-mail já tem cadastro. Entre ou recupere a senha."
  }

  if (/duplicate key|already exists/i.test(message)) {
    return "Este usuário ou e-mail já está cadastrado."
  }

  if (/Password should be at least/i.test(message)) {
    return "A senha precisa ter pelo menos 6 caracteres."
  }

  return message || "Não foi possível concluir."
}

function createEmptyForm(date = todayISO()): ShiftForm {
  return {
    date,
    location: "",
    kind: "MT",
    paid: false,
    amount: "",
    notes: "",
    personType: "PF",
  }
}

function buildCalendar(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  const firstDay = new Date(year, month - 1, 1, 12)
  const totalDays = new Date(year, month, 0, 12).getDate()
  const leadingBlankDays = (firstDay.getDay() + 6) % 7
  const days: Array<{ iso: string; label: number } | null> = []

  for (let index = 0; index < leadingBlankDays; index += 1) {
    days.push(null)
  }

  for (let day = 1; day <= totalDays; day += 1) {
    days.push({
      iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0",
      )}`,
      label: day,
    })
  }

  return days
}

function shiftsForCsv(shifts: Shift[]) {
  return shifts.map((shift) => ({
    date: shift.date,
    location: shift.location,
    kind: shift.kind,
    period: SHIFT_BY_CODE[shift.kind]?.period,
    paid: shift.paid,
    amount: shift.amount,
    notes: shift.notes,
    personType: shift.personType,
  }))
}

function exportMonthCsv(
  shifts: Shift[],
  monthKey: string,
  personScope: PersonScope = "todos",
) {
  downloadShiftsCsv(shiftsForCsv(shifts), {
    label: monthKey,
    personScope,
  })
}

function exportYearCsv(
  shifts: Shift[],
  year: number,
  personScope: PersonScope = "todos",
) {
  const yearShifts = shifts.filter((shift) => shift.date.startsWith(`${year}-`))
  downloadShiftsCsv(shiftsForCsv(yearShifts), {
    label: String(year),
    personScope,
  })
}


function MetricCard({
  accentClassName,
  detail,
  icon,
  label,
  value,
}: {
  accentClassName?: string
  detail: string
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <Card className="h-full border-[#F3D5DC] bg-white shadow-sm">
      <CardContent className="grid min-h-24 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 p-3 sm:gap-3 sm:p-4">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-primary sm:size-10",
            accentClassName,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs font-semibold text-muted-foreground sm:text-sm">
            {label}
          </p>
          <p className="truncate text-lg font-bold leading-tight text-foreground sm:text-2xl">{value}</p>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-[#F3D5DC] bg-white text-muted-foreground hover:border-rose-300 hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function PaymentStatusBadge({ shift }: { shift: Shift }) {
  const status = PAYMENT_STATUS_META[getPaymentStatus(shift)]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        status.className,
      )}
    >
      {status.label}
    </span>
  )
}

function ShiftCard({
  onDelete,
  onEdit,
  onTogglePaid,
  shift,
}: {
  onDelete: (shift: Shift) => void
  onEdit: (shift: Shift) => void
  onTogglePaid: (shiftId: string) => void
  shift: Shift
}) {
  const meta = SHIFT_BY_CODE[shift.kind]

  return (
    <Card className="overflow-hidden border-[#F3D5DC] bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">
                {formatShortDate(shift.date)}, {formatWeekday(shift.date)}
              </p>
              <h3 className="mt-1 truncate text-lg font-bold leading-tight text-foreground">
                {shift.location}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock3 className="size-3.5" />
                {shift.kind} · {meta.name} · {meta.period}
              </p>
            </div>
            <PaymentStatusBadge shift={shift} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
              <MapPin className="size-3" />
              {shift.location}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                meta.tone,
              )}
            >
              {shift.kind}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {meta.hours}h
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold",
                (shift.personType ?? "PF") === "PF"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-teal-200 bg-teal-50 text-teal-800",
              )}
            >
              {(shift.personType ?? "PF") === "PF"
                ? "Pessoa Física"
                : "Pessoa Jurídica"}
            </span>
            {shift.amount ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {formatCurrency(shift.amount)}
              </span>
            ) : null}
          </div>

          {shift.notes ? (
            <p className="rounded-lg bg-rose-50/70 px-3 py-2 text-sm text-muted-foreground">
              {shift.notes}
            </p>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
          <Button
            type="button"
            variant={shift.paid ? "secondary" : "outline"}
            size="sm"
            onClick={() => onTogglePaid(shift.id)}
          >
            <CheckCircle2 className="size-4" />
            {shift.paid ? "Recebido" : "Marcar recebido"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onEdit(shift)}
            aria-label="Editar plantão"
          >
            <Edit3 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(shift)}
            aria-label="Excluir plantão"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ProgressRow({
  detail,
  label,
  total,
  value,
}: {
  detail?: string
  label: string
  total: number
  value: number
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-foreground">{label}</span>
        <span className="shrink-0 font-semibold text-muted-foreground">
          {detail ?? value}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-rose-100">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function App() {
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [authStatus, setAuthStatus] = useState<
    "checking" | "authenticated" | "anonymous"
  >(isSupabaseConfigured ? "checking" : "anonymous")
  const [authMode, setAuthMode] = useState<AuthMode>(getInitialAuthMode)
  const [authForm, setAuthForm] = useState<AuthForm>(createEmptyAuthForm)
  const [authError, setAuthError] = useState(
    isSupabaseConfigured
      ? ""
      : "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
  )
  const [authMessage, setAuthMessage] = useState("")
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [hasLoadedRemote, setHasLoadedRemote] = useState(false)
  const [shifts, setShifts] = useState<Shift[]>(readStoredShifts)
  const [locations, setLocations] = useState<string[]>(readStoredLocations)
  const [selectedMonth, setSelectedMonth] = useState(monthKeyFromDate(new Date()))
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("todos")
  const [locationFilter, setLocationFilter] = useState("todos")
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>("todos")
  const [personFilter, setPersonFilter] = useState<PersonFilter>("todos")
  const [activeTab, setActiveTab] = useState<TabId>("agenda")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ShiftForm>(() => createEmptyForm())
  const [newLocationName, setNewLocationName] = useState("")
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileYear, setProfileYear] = useState(() => new Date().getFullYear())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts))
  }, [shifts])

  useEffect(() => {
    window.localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations))
  }, [locations])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return
    }

    let isActive = true

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isActive) {
          return
        }

        if (error) {
          setAuthError(formatAuthError(error))
          setAuthStatus("anonymous")
          return
        }

        const nextSession = toAuthSession(data.session)
        setSession(nextSession)
        setAuthStatus(
          nextSession && authMode !== "update-password" ? "checking" : "anonymous",
        )
      })
      .catch((error: Error) => {
        if (!isActive) {
          return
        }

        setAuthError(formatAuthError(error))
        setAuthStatus("anonymous")
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSupabaseSession) => {
      if (!isActive) {
        return
      }

      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("update-password")
        setAuthMessage("Digite a nova senha para concluir a recuperação.")
        setAuthError("")
        setSession(toAuthSession(nextSupabaseSession))
        setAuthStatus("anonymous")
        return
      }

      if (event === "SIGNED_OUT") {
        setSession(null)
        setHasLoadedRemote(false)
        setAuthStatus("anonymous")
        return
      }

      const nextSession = toAuthSession(nextSupabaseSession)
      setSession(nextSession)
      setHasLoadedRemote(false)
      setAuthStatus(
        nextSession && authMode !== "update-password" ? "checking" : "anonymous",
      )
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [authMode])

  useEffect(() => {
    if (!session || authMode === "update-password") {
      return
    }

    let isActive = true

    apiRequest<{ locations: string[]; shifts: Shift[] }>("/api/app-data", {
      method: "GET",
      token: session.token,
    })
      .then((remoteData) => {
        if (!isActive) {
          return
        }

        const accountLocations = mergeLocations(DEFAULT_LOCATIONS, remoteData.locations)
        const accountShifts = sanitizeShifts(remoteData.shifts)

        setLocations(accountLocations)
        setShifts(accountShifts)
        setHasLoadedRemote(true)
        setAuthStatus("authenticated")
      })
      .catch((error: Error) => {
        if (!isActive) {
          return
        }

        if (error.message === "Sessão expirada") {
          setSession(null)
          setAuthStatus("anonymous")
          setAuthError("Sessão expirada. Entre novamente.")
          return
        }

        console.error(error.message)
        setAuthStatus("authenticated")
        setHasLoadedRemote(false)
      })

    return () => {
      isActive = false
    }
  }, [authMode, session])

  useEffect(() => {
    if (!session || !hasLoadedRemote || authMode === "update-password") {
      return
    }

    const timeout = window.setTimeout(() => {
      apiRequest("/api/app-data", {
        method: "PUT",
        token: session.token,
        body: JSON.stringify({ locations, shifts }),
      })
        .catch((error: Error) => console.error(error.message))
    }, 400)

    return () => window.clearTimeout(timeout)
  }, [authMode, hasLoadedRemote, locations, session, shifts])

  const monthShifts = useMemo(() => {
    return shifts.filter((shift) => shift.date.startsWith(selectedMonth)).sort(sortShifts)
  }, [selectedMonth, shifts])

  const availableLocations = useMemo(() => {
    return mergeLocations(
      DEFAULT_LOCATIONS,
      locations,
      shifts.map((shift) => shift.location),
    )
  }, [locations, shifts])

  const summaryLocations = useMemo(() => {
    return mergeLocations(
      availableLocations,
      monthShifts.map((shift) => shift.location),
    )
  }, [availableLocations, monthShifts])

  const filteredShifts = useMemo(() => {
    return monthShifts.filter((shift) => {
      const matchesPayment =
        paymentFilter === "todos" ||
        (paymentFilter === "pendentes" && !shift.paid) ||
        (paymentFilter === "recebidos" && shift.paid)
      const matchesLocation =
        locationFilter === "todos" || shift.location === locationFilter
      const matchesShift = shiftFilter === "todos" || shift.kind === shiftFilter
      const matchesPerson =
        personFilter === "todos" || (shift.personType ?? "PF") === personFilter

      return matchesPayment && matchesLocation && matchesShift && matchesPerson
    })
  }, [locationFilter, monthShifts, paymentFilter, personFilter, shiftFilter])

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Shift[]>()

    filteredShifts.forEach((shift) => {
      const group = groups.get(shift.date) ?? []
      group.push(shift)
      groups.set(shift.date, group)
    })

    return Array.from(groups.entries()).map(([date, dayShifts]) => ({
      date,
      shifts: dayShifts.sort(sortShifts),
    }))
  }, [filteredShifts])

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>()

    monthShifts.forEach((shift) => {
      const dayShifts = map.get(shift.date) ?? []
      dayShifts.push(shift)
      map.set(shift.date, dayShifts)
    })

    return map
  }, [monthShifts])

  const calendarDays = useMemo(() => buildCalendar(selectedMonth), [selectedMonth])

  const stats = useMemo(() => {
    const paid = monthShifts.filter((shift) => shift.paid).length
    const totalHours = monthShifts.reduce((sum, shift) => {
      return sum + SHIFT_BY_CODE[shift.kind].hours
    }, 0)
    const totalAmount = monthShifts.reduce((sum, shift) => {
      return sum + (shift.amount ?? 0)
    }, 0)
    const receivedAmount = monthShifts.reduce((sum, shift) => {
      return sum + (shift.paid ? shift.amount ?? 0 : 0)
    }, 0)
    const pendingAmount = totalAmount - receivedAmount
    const byLocation = summaryLocations
      .map((location) => ({
        location,
        count: monthShifts.filter((shift) => shift.location === location).length,
      }))
      .filter((item) => item.count > 0)
    const byType = SHIFT_TYPES.map((shiftType) => {
      const shiftsByType = monthShifts.filter(
        (shift) => shift.kind === shiftType.code,
      )

      return {
        code: shiftType.code,
        count: shiftsByType.length,
        hours: shiftsByType.reduce((sum, shift) => {
          return sum + SHIFT_BY_CODE[shift.kind].hours
        }, 0),
      }
    }).filter((item) => item.count > 0)
    const pfShifts = monthShifts.filter((shift) => (shift.personType ?? "PF") === "PF")
    const pjShifts = monthShifts.filter((shift) => (shift.personType ?? "PF") === "PJ")
    const pfAmount = pfShifts.reduce((sum, shift) => sum + (shift.amount ?? 0), 0)
    const pjAmount = pjShifts.reduce((sum, shift) => sum + (shift.amount ?? 0), 0)

    return {
      total: monthShifts.length,
      paid,
      pending: monthShifts.length - paid,
      totalHours,
      totalAmount,
      receivedAmount,
      pendingAmount,
      byLocation,
      byType,
      pfCount: pfShifts.length,
      pjCount: pjShifts.length,
      pfAmount,
      pjAmount,
    }
  }, [monthShifts, summaryLocations])

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()])
    shifts.forEach((shift) => {
      const year = Number(shift.date.slice(0, 4))
      if (Number.isFinite(year)) years.add(year)
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [shifts])

  const annualStats = useMemo(() => {
    const prefix = `${profileYear}-`
    const yearShifts = shifts.filter((shift) => shift.date.startsWith(prefix))
    const pf = yearShifts.filter((shift) => (shift.personType ?? "PF") === "PF")
    const pj = yearShifts.filter((shift) => (shift.personType ?? "PF") === "PJ")
    const totalAmount = yearShifts.reduce((sum, s) => sum + (s.amount ?? 0), 0)
    const pfAmount = pf.reduce((sum, s) => sum + (s.amount ?? 0), 0)
    const pjAmount = pj.reduce((sum, s) => sum + (s.amount ?? 0), 0)
    const pfPct = totalAmount > 0 ? Math.round((pfAmount / totalAmount) * 100) : 0
    const pjPct = totalAmount > 0 ? 100 - pfPct : 0
    return {
      yearShifts,
      total: yearShifts.length,
      totalAmount,
      pfCount: pf.length,
      pjCount: pj.length,
      pfAmount,
      pjAmount,
      pfPct,
      pjPct,
    }
  }, [profileYear, shifts])

  const userInitials = useMemo(() => {
    const source = session?.fullName ?? session?.email ?? ""
    const parts = source.replace(/[._\-+]+/g, " ").trim().split(/\s+/)
    const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")
    return letters.toUpperCase().slice(0, 2) || "U"
  }, [session?.fullName, session?.email])



  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsAuthSubmitting(true)
    setAuthError("")
    setAuthMessage("")

    if (!supabase) {
      setAuthError(
        "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
      )
      setIsAuthSubmitting(false)
      return
    }

    try {
      const email = authForm.email.trim().toLowerCase()
      const password = authForm.password
      const username = normalizeUsername(authForm.username)

      if (authMode !== "update-password" && !email) {
        throw new Error(
          authMode === "login"
            ? "Informe o e-mail ou usuário."
            : "Informe o e-mail.",
        )
      }

      if (authMode !== "recover" && password.length < 6) {
        throw new Error("A senha precisa ter pelo menos 6 caracteres.")
      }

      if (
        (authMode === "signup" || authMode === "update-password") &&
        password !== authForm.confirmPassword
      ) {
        throw new Error("As senhas não conferem.")
      }

      if (authMode === "recover") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthRedirectUrl(),
        })

        if (error) {
          throw error
        }

        setAuthMessage(
          "Se esse e-mail tiver cadastro, o Supabase enviará o link de recuperação.",
        )
        return
      }

      if (authMode === "signup") {
        if (!isValidUsername(username)) {
          throw new Error("Use 3 a 24 caracteres no usuário: letras, números ou _.")
        }

        await registerAuthUsername(email, username)

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
            data: {
              username,
            },
          },
        })

        if (error) {
          throw error
        }

        const nextSession = toAuthSession(data.session)

        if (nextSession) {
          setAuthStatus("checking")
          setSession(nextSession)
          setAuthForm(createEmptyAuthForm())
          return
        }

        setAuthMode("login")
        setAuthForm((current) => ({
          ...createEmptyAuthForm(),
          email: current.email,
        }))
        setAuthMessage("Cadastro criado. Confirme pelo e-mail antes de entrar.")
        return
      }

      if (authMode === "update-password") {
        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
          throw error
        }

        await supabase.auth.signOut()
        setSession(null)
        setAuthMode("login")
        setAuthStatus("anonymous")
        setAuthForm(createEmptyAuthForm())
        setAuthMessage("Senha atualizada. Entre novamente com a nova senha.")
        window.history.replaceState(null, "", window.location.pathname)
        return
      }

      const loginEmail = await resolveAuthEmail(email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) {
        throw error
      }

      setAuthStatus("checking")
      setSession(toAuthSession(data.session))
      setAuthForm((current) => ({ ...current, password: "", confirmPassword: "" }))
    } catch (error) {
      setAuthError(formatAuthError(error))
    } finally {
      setIsAuthSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await supabase?.auth.signOut()
    setSession(null)
    setAuthMode("login")
    setAuthStatus("anonymous")
    setHasLoadedRemote(false)
  }

  const openNewShift = (date = todayISO()) => {
    setEditingId(null)
    setForm(createEmptyForm(date))
    setNewLocationName("")
    setDialogOpen(true)
  }

  const openEditShift = (shift: Shift) => {
    setEditingId(shift.id)
    setForm({
      date: shift.date,
      location: shift.location,
      kind: shift.kind,
      paid: shift.paid,
      amount: shift.amount ? String(shift.amount).replace(".", ",") : "",
      notes: shift.notes ?? "",
      personType: shift.personType ?? "PF",
    })
    setNewLocationName("")
    setDialogOpen(true)
  }

  const addCustomLocation = () => {
    const location = normalizeLocationName(newLocationName)

    if (!location) {
      return
    }

    setLocations((current) => mergeLocations(current, [location]))
    setForm((current) => ({
      ...current,
      location,
    }))
    setNewLocationName("")
  }

  const handleNewLocationKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    addCustomLocation()
  }

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = {
      date: form.date,
      location: normalizeLocationName(form.location),
      kind: form.kind,
      paid: form.paid,
      amount: parseAmount(form.amount),
      notes: form.notes.trim(),
      personType: form.personType,
    }

    setLocations((current) => mergeLocations(current, [payload.location]))

    if (editingId) {
      setShifts((current) =>
        current.map((shift) =>
          shift.id === editingId
            ? {
                ...shift,
                ...payload,
                updatedAt: new Date().toISOString(),
              }
            : shift,
        ),
      )
    } else {
      setShifts((current) => [
        ...current,
        {
          id: createId(),
          ...payload,
          createdAt: new Date().toISOString(),
        },
      ])
      setSelectedMonth(payload.date.slice(0, 7))
    }

    setDialogOpen(false)
  }

  const togglePaid = (shiftId: string) => {
    setShifts((current) =>
      current.map((shift) =>
        shift.id === shiftId
          ? {
              ...shift,
              paid: !shift.paid,
              updatedAt: new Date().toISOString(),
            }
          : shift,
      ),
    )
  }

  const deleteShift = (shift: Shift) => {
    const shouldDelete = window.confirm(
      `Excluir o plantão de ${formatShortDate(shift.date)} em ${shift.location}?`,
    )

    if (!shouldDelete) {
      return
    }

    setShifts((current) => current.filter((item) => item.id !== shift.id))
  }

  if (!session || authStatus === "anonymous") {
    const authSubmitLabelByMode: Record<AuthMode, string> = {
      login: "Entrar",
      recover: "Enviar link",
      signup: "Criar conta",
      "update-password": "Atualizar senha",
    }
    const isPasswordVisible = authMode !== "recover"
    const isEmailVisible = authMode !== "update-password"
    const isUsernameVisible = authMode === "signup"
    const isConfirmVisible =
      authMode === "signup" || authMode === "update-password"

    return (
      <div className="relative min-h-dvh overflow-hidden bg-gradient-canvas text-foreground">
        <div className="pointer-events-none absolute -left-32 -top-32 size-[420px] rounded-full bg-gradient-brand opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 size-[480px] rounded-full bg-rose-200/40 blur-3xl" />

        <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-5 py-10">
          {/* Form panel */}
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 flex flex-col items-center text-center">
              <img
                src="/logo-plantoes-gabi.png"
                alt="Plantões da Gabi"
                className="h-44 w-auto rounded-3xl bg-white object-contain p-2 shadow-elevated ring-1 ring-rose-100 sm:h-52"
              />
            </div>

            <Card className="overflow-hidden rounded-[1.75rem] border-rose-100/80 bg-white/95 shadow-elevated backdrop-blur-xl">
              <CardContent
                key={authMode}
                className="auth-panel px-7 pb-7 pt-8 sm:px-9"
              >
                <div className="mb-6 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                    {authMode === "signup"
                      ? "Nova conta"
                      : authMode === "recover"
                        ? "Recuperar acesso"
                        : authMode === "update-password"
                          ? "Nova senha"
                          : "Bem-vindo de volta"}
                  </p>
                  {authMode !== "login" ? (
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]">
                      {authMode === "signup"
                        ? "Crie sua conta"
                        : authMode === "recover"
                          ? "Vamos recuperar"
                          : "Defina uma nova senha"}
                    </h2>
                  ) : null}
                </div>

                <form className="space-y-4" onSubmit={handleAuthSubmit}>
                  {isEmailVisible ? (
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="auth-email"
                        className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {authMode === "login" ? "E-mail ou usuário" : "E-mail"}
                      </Label>
                      <Input
                        id="auth-email"
                        ref={emailInputRef}
                        type={authMode === "login" ? "text" : "email"}
                        autoComplete={authMode === "login" ? "username" : "email"}
                        autoCapitalize="none"
                        inputMode={authMode === "login" ? "text" : "email"}
                        spellCheck={false}
                        className="h-12 rounded-xl border-rose-100 bg-rose-50/40 px-4 text-[15px] shadow-none transition-all duration-200 focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/15"
                        value={authForm.email}
                        onPointerDown={() => emailInputRef.current?.focus()}
                        onTouchStart={() => emailInputRef.current?.focus()}
                        onChange={(event) =>
                          setAuthForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : null}
                  {isUsernameVisible ? (
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="auth-username"
                        className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Usuário
                      </Label>
                      <Input
                        id="auth-username"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        inputMode="text"
                        spellCheck={false}
                        className="h-12 rounded-xl border-rose-100 bg-rose-50/40 px-4 text-[15px] shadow-none transition-all duration-200 focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/15"
                        placeholder="gabi"
                        value={authForm.username}
                        onChange={(event) =>
                          setAuthForm((current) => ({
                            ...current,
                            username: normalizeUsername(event.target.value),
                          }))
                        }
                      />
                    </div>
                  ) : null}
                  {isPasswordVisible ? (
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="auth-password"
                        className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Senha
                      </Label>
                      <div className="relative">
                        <Input
                          id="auth-password"
                          ref={passwordInputRef}
                          type={showPassword ? "text" : "password"}
                          autoComplete={
                            authMode === "login"
                              ? "current-password"
                              : "new-password"
                          }
                          autoCapitalize="none"
                          spellCheck={false}
                          className="h-12 rounded-xl border-rose-100 bg-rose-50/40 px-4 pr-12 text-[15px] shadow-none transition-all duration-200 focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/15"
                          value={authForm.password}
                          onPointerDown={() => passwordInputRef.current?.focus()}
                          onTouchStart={() => passwordInputRef.current?.focus()}
                          onChange={(event) =>
                            setAuthForm((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          onClick={() => setShowPassword((current) => !current)}
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {isConfirmVisible ? (
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="auth-confirm-password"
                        className="text-[0.78rem] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        Confirmar senha
                      </Label>
                      <div className="relative">
                        <Input
                          id="auth-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          autoCapitalize="none"
                          spellCheck={false}
                          className="h-12 rounded-xl border-rose-100 bg-rose-50/40 px-4 pr-12 text-[15px] shadow-none transition-all duration-200 focus-visible:border-primary/40 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary/15"
                          value={authForm.confirmPassword}
                          onChange={(event) =>
                            setAuthForm((current) => ({
                              ...current,
                              confirmPassword: event.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          onClick={() => setShowConfirmPassword((current) => !current)}
                          aria-label={
                            showConfirmPassword
                              ? "Ocultar confirmação de senha"
                              : "Mostrar confirmação de senha"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                      {authForm.confirmPassword.length > 0 ? (
                        authForm.password === authForm.confirmPassword ? (
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="size-3.5" />
                            As senhas coincidem
                          </p>
                        ) : (
                          <p className="text-xs font-semibold text-red-600">
                            As senhas não coincidem
                          </p>
                        )
                      ) : null}
                    </div>
                  ) : null}
                  {authError ? (
                    <p className="rounded-xl border border-red-200 bg-red-50/80 px-3.5 py-2.5 text-sm font-medium text-red-700">
                      {authError}
                    </p>
                  ) : null}
                  {authMessage ? (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5 text-sm font-medium text-emerald-700">
                      {authMessage}
                    </p>
                  ) : null}
                  <Button
                    className="relative h-12 w-full overflow-hidden rounded-xl border border-rose-300/50 bg-[linear-gradient(135deg,#fda4af_0%,#fb7185_45%,#f43f5e_100%)] text-[15px] font-semibold tracking-wide text-white shadow-[0_18px_40px_-12px_rgba(244,63,94,0.55),inset_0_1px_0_rgba(255,255,255,0.45)] transition-all duration-200 hover:brightness-[1.06] hover:shadow-[0_22px_50px_-12px_rgba(244,63,94,0.65),inset_0_1px_0_rgba(255,255,255,0.5)] active:scale-[0.99] disabled:opacity-70"
                    disabled={
                      isAuthSubmitting ||
                      !isSupabaseConfigured ||
                      ((authMode === "signup" || authMode === "update-password") &&
                        authForm.confirmPassword.length > 0 &&
                        authForm.password !== authForm.confirmPassword)
                    }
                    type="submit"
                  >
                    {authMode === "signup" ? <UserPlus className="size-4" /> : null}
                    {authMode === "recover" ? <Mail className="size-4" /> : null}
                    {authMode === "update-password" ? (
                      <KeyRound className="size-4" />
                    ) : null}
                    {authMode === "login" ? <LogIn className="size-4" /> : null}
                    {isAuthSubmitting ? "Aguarde..." : authSubmitLabelByMode[authMode]}
                  </Button>
                  {authMode === "login" || authMode === "signup" ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!supabase) return
                        setAuthError("")
                        try {
                          await supabase.auth.signInWithOAuth({
                            provider: "google",
                            options: { redirectTo: getAuthRedirectUrl() },
                          })
                        } catch (err) {
                          setAuthError(
                            err instanceof Error ? err.message : "Falha ao entrar com Google",
                          )
                        }
                      }}
                      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-rose-100 bg-white text-[15px] font-semibold text-foreground shadow-sm transition-all duration-200 hover:border-rose-200 hover:bg-rose-50/60 active:scale-[0.99]"
                    >
                      <GoogleLogo />
                      Entrar com Google
                    </button>
                  ) : null}
                </form>

                {authMode !== "update-password" ? (
                  <>
                    <div className="my-6 flex items-center gap-3">
                      <span className="h-px flex-1 bg-rose-100" />
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {authMode === "login" ? "ou" : ""}
                      </span>
                      <span className="h-px flex-1 bg-rose-100" />
                    </div>
                    <div className="grid gap-2 text-center text-sm">
                      {authMode !== "login" ? (
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 font-semibold text-primary transition-colors hover:bg-rose-50"
                          onClick={() => {
                            setAuthMode("login")
                            setAuthError("")
                            setAuthMessage("")
                          }}
                        >
                          ← Voltar para entrada
                        </button>
                      ) : null}
                      {authMode === "login" ? (
                        <>
                          <button
                            type="button"
                            className="rounded-lg px-3 py-2 font-semibold text-foreground transition-colors hover:bg-rose-50 hover:text-primary"
                            onClick={() => {
                              setAuthMode("signup")
                              setAuthError("")
                              setAuthMessage("")
                            }}
                          >
                            Criar uma nova conta
                          </button>
                          <button
                            type="button"
                            className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-primary"
                            onClick={() => {
                              setAuthMode("recover")
                              setAuthError("")
                              setAuthMessage("")
                            }}
                          >
                            Esqueci minha senha
                          </button>
                        </>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            <SiteFooter className="mt-8" />
          </div>
        </div>
      </div>
    )
  }
  if (authStatus === "checking") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#FFF4F6] px-4 text-center text-foreground">
        <div className="space-y-3">
          <img
            src="/logo-plantoes-gabi.png"
            alt="Plantões da Gabi"
            className="mx-auto h-28 w-auto rounded-3xl bg-white object-contain p-2 shadow-elevated ring-1 ring-rose-100"
          />
          <p className="text-sm font-semibold text-muted-foreground">
            Sincronizando plantões...
          </p>
        </div>
        <SiteFooter />
      </div>
    )
  }

  const hasAmounts = stats.totalAmount > 0
  const isCurrentMonth = selectedMonth === monthKeyFromDate(new Date())

  return (
    <div className="min-h-dvh bg-[#FFF4F6] text-foreground">
      <header className="safe-top sticky top-0 z-30 border-b border-[#F3D5DC] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-[480px] grid-cols-1 justify-items-center gap-3 px-4 pb-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center lg:max-w-[1180px]">
          <div className="min-w-0 justify-self-center overflow-hidden rounded-xl bg-white sm:justify-self-start lg:w-fit">
            <img
              src="/logo-plantoes-gabi.png"
              alt="Plantões da Gabi"
              className="h-20 w-auto object-contain sm:h-24 lg:h-28"
            />
          </div>

          <div className="w-[240px] max-w-full justify-self-center sm:w-[280px]">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[#F3D5DC] bg-white p-2 shadow-sm">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 bg-white"
                onClick={() => setSelectedMonth((month) => addMonths(month, -1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="min-w-0 text-center">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Mês
                </p>
                <h1 className="whitespace-nowrap text-lg font-bold leading-tight text-foreground sm:text-xl">
                  {formatMonth(selectedMonth)}
                </h1>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 bg-white"
                onClick={() => setSelectedMonth((month) => addMonths(month, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            {!isCurrentMonth ? (
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-primary hover:underline"
                onClick={() => setSelectedMonth(monthKeyFromDate(new Date()))}
              >
                Voltar para o mês atual
              </button>
            ) : null}
          </div>

          <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:justify-self-end">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Abrir meu perfil"
              title="Abrir meu perfil"
              className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#F3D5DC] bg-white px-4 text-sm font-semibold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-md"
            >
              <User className="size-4" />
              <span>{session.firstName ? `Olá, ${session.firstName}` : "Perfil"}</span>
              <ChevronRight className="size-4 text-rose-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sair da conta"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-rose-100 bg-white/70 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-rose-50 hover:text-primary"
            >
              <LogOut className="size-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[520px] space-y-5 px-4 pb-8 pt-4 lg:max-w-[960px]">

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabId)}
          className="lg:col-start-1 lg:row-start-2"
        >
          <TabsList className="grid w-full grid-cols-3 lg:max-w-md">
            <TabsTrigger value="agenda">
              <CalendarDays className="size-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="plantoes">
              <Table2 className="size-4" />
              Plantões
            </TabsTrigger>
            <TabsTrigger value="resumo">
              <BarChart3 className="size-4" />
              Resumo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="space-y-4">

            <Card className="border-[#F3D5DC] bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Calendário</CardTitle>
                <CardDescription>
                  {formatShiftCount(stats.total)} em {formatMonth(selectedMonth)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-rose-50/80 p-3 text-left"
                  role="note"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-brand"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    <Plus className="size-5" aria-hidden />
                  </span>
                  <p className="text-xs font-semibold text-foreground sm:text-sm">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-primary">
                      Como adicionar
                    </span>
                    Toque em qualquer dia do calendário abaixo para registrar um plantão.
                  </p>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
                  {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return <div key={`blank-${index}`} className="min-h-14 lg:min-h-20" />
                    }

                    const dayShifts = shiftsByDate.get(day.iso) ?? []
                    const isToday = day.iso === todayISO()

                    return (
                      <button
                        key={day.iso}
                        type="button"
                        aria-label={
                          dayShifts.length > 0
                            ? `Dia ${day.label} — adicionar plantão`
                            : `Dia ${day.label} — adicionar plantão`
                        }
                        className={cn(
                          "group relative min-h-16 cursor-pointer rounded-lg border p-1.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md lg:min-h-20 lg:p-2",
                          dayShifts.length > 0
                            ? "border-rose-200 bg-rose-50/90 hover:border-rose-300"
                            : "border-dashed border-rose-200 bg-white hover:border-primary hover:bg-rose-50",
                          isToday && "border-solid border-primary ring-1 ring-primary/30",
                        )}
                        onClick={() => openNewShift(day.iso)}
                      >
                        <span
                          className={cn(
                            "inline-flex size-6 items-center justify-center rounded-md text-xs font-semibold",
                            isToday && "bg-primary text-primary-foreground",
                          )}
                        >
                          {day.label}
                        </span>
                        {dayShifts.length === 0 ? (
                          <span
                            className="pointer-events-none absolute bottom-1 right-1 inline-flex size-5 items-center justify-center rounded-full bg-rose-100 text-primary opacity-80 transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:opacity-100 lg:size-6"
                            aria-hidden
                          >
                            <Plus className="size-3 lg:size-3.5" strokeWidth={3} />
                          </span>
                        ) : null}
                        <div className="mt-1 flex min-h-6 flex-wrap items-start gap-1">
                          {dayShifts.slice(0, 2).map((shift) => {
                            const meta = SHIFT_BY_CODE[shift.kind]

                            return (
                              <span
                                key={shift.id}
                                className={cn(
                                  "rounded border px-1.5 py-0.5 text-[10px] font-bold shadow-sm",
                                  meta.tone,
                                )}
                              >
                                {shift.kind}
                              </span>
                            )
                          })}
                          {dayShifts.length > 2 ? (
                            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground shadow-sm">
                              +{dayShifts.length - 2}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="border-t border-rose-100 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Legenda dos turnos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SHIFT_TYPES.map((shiftType) => (
                      <div
                        key={shiftType.code}
                        className="flex items-center gap-1.5 rounded-full bg-rose-50/70 px-2 py-1"
                      >
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                            shiftType.tone,
                          )}
                        >
                          {shiftType.code}
                        </span>
                        <span className="max-w-28 truncate text-[11px] font-medium text-muted-foreground">
                          {shiftType.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#F3D5DC] bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle>Resumo fiscal</CardTitle>
                <CardDescription className="capitalize">
                  {formatMonth(selectedMonth)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-amber-900">
                        Pessoa Física
                      </p>
                      <p className="text-xs text-amber-800/80">
                        {formatShiftCount(stats.pfCount)}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-extrabold text-amber-900">
                      {formatCurrency(stats.pfAmount)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-emerald-900">
                        Pessoa Jurídica
                      </p>
                      <p className="text-xs text-emerald-800/80">
                        {formatShiftCount(stats.pjCount)}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-extrabold text-emerald-900">
                      {formatCurrency(stats.pjAmount)}
                    </p>
                  </div>
                </div>

                <Separator className="bg-rose-100" />

                <div className="space-y-2">
                  <Button
                    type="button"
                    className="w-full rounded-xl shadow-soft"
                    onClick={() => exportMonthCsv(monthShifts, selectedMonth, "todos")}
                    disabled={monthShifts.length === 0}
                  >
                    <Download className="size-4" />
                    Exportar mês
                  </Button>
                  <div
                    className="grid grid-cols-3 gap-2"
                    role="group"
                    aria-label="Exportar plantões do mês por tipo"
                  >
                    {(["todos", "PF", "PJ"] as const).map((scope) => {
                      const subset =
                        scope === "todos"
                          ? monthShifts
                          : monthShifts.filter(
                              (shift) => (shift.personType ?? "PF") === scope,
                            )
                      const label = scope === "todos" ? "Todos" : scope
                      return (
                        <Button
                          key={scope}
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={subset.length === 0}
                          aria-label={`Exportar CSV ${label} (${subset.length} plantões)`}
                          onClick={() => exportMonthCsv(subset, selectedMonth, scope)}
                        >
                          {label}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-rose-50 to-white p-3 text-left text-sm text-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-rose-50"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-primary-foreground shadow-brand"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    <User className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-primary">
                      Declaração anual
                    </span>
                    <span className="block text-xs font-medium text-muted-foreground">
                      Veja os rendimentos totais do ano no <span className="font-semibold text-foreground">Perfil</span>.
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-primary" />
                </button>
              </CardContent>
            </Card>

          </TabsContent>


          <TabsContent value="plantoes" className="space-y-4">
            <section aria-label="Filtros">
              <div className="mb-3 flex h-10 items-center gap-2 px-1 text-base font-semibold text-foreground">
                <Filter className="size-4 text-muted-foreground" />
                Filtros
              </div>
              <Card className="border-[#F3D5DC] bg-white shadow-sm">
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Status
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "todos", label: "Todos" },
                        { value: "pendentes", label: "Pendentes" },
                        { value: "recebidos", label: "Recebidos" },
                      ].map((option) => (
                        <FilterChip
                          key={option.value}
                          active={paymentFilter === option.value}
                          onClick={() => setPaymentFilter(option.value as PaymentFilter)}
                        >
                          {option.label}
                        </FilterChip>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">
                      Tipo para ir
                    </Label>
                    <div
                      className="flex flex-wrap gap-2"
                      role="group"
                      aria-label="Filtrar por tipo de pessoa"
                    >
                      {(
                        [
                          { value: "todos", label: "Todos" },
                          { value: "PF", label: "PF" },
                          { value: "PJ", label: "PJ" },
                        ] as const
                      ).map((option) => (
                        <FilterChip
                          key={option.value}
                          active={personFilter === option.value}
                          onClick={() => setPersonFilter(option.value)}
                        >
                          {option.label}
                        </FilterChip>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">
                        Local
                      </Label>
                      <Select value={locationFilter} onValueChange={setLocationFilter}>
                        <SelectTrigger aria-label="Filtrar por local">
                          <SelectValue placeholder="Local" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos locais</SelectItem>
                          {availableLocations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">
                        Turno
                      </Label>
                      <Select
                        value={shiftFilter}
                        onValueChange={(value) => setShiftFilter(value as ShiftFilter)}
                      >
                        <SelectTrigger aria-label="Filtrar por turno">
                          <SelectValue placeholder="Turno" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos turnos</SelectItem>
                          {SHIFT_TYPES.map((shiftType) => (
                            <SelectItem key={shiftType.code} value={shiftType.code}>
                              {shiftType.code} · {shiftType.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Button
                type="button"
                className="mt-3 w-full rounded-xl shadow-soft"
                onClick={() => openNewShift()}
              >
                <Plus className="size-4" />
                Novo plantão
              </Button>
            </section>
            <Card className="overflow-hidden border-[#F3D5DC] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3D5DC] p-4">
                <div>
                  <h2 className="text-base font-semibold">Plantões</h2>
                  <p
                    className="text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    {formatShiftCount(filteredShifts.length)} nos filtros
                  </p>
                </div>
                <div
                  className="flex flex-wrap items-center gap-2"
                  role="group"
                  aria-label="Exportar plantões filtrados"
                >
                  {(["todos", "PF", "PJ"] as const).map((scope) => {
                    const subset =
                      scope === "todos"
                        ? filteredShifts
                        : filteredShifts.filter(
                            (shift) => (shift.personType ?? "PF") === scope,
                          )
                    const label =
                      scope === "todos" ? "Todos" : scope
                    return (
                      <Button
                        key={scope}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={subset.length === 0}
                        aria-label={`Exportar CSV ${label} (${subset.length} plantões)`}
                        onClick={() =>
                          exportMonthCsv(subset, selectedMonth, scope)
                        }
                      >
                        <Download className="size-4" />
                        {label}
                      </Button>
                    )
                  })}
                </div>
              </div>


              {groupedByDate.length > 0 ? (
                <div className="space-y-5 bg-[#FFF4F6] p-4">
                  {groupedByDate.map((group) => (
                    <section key={group.date} className="space-y-3">
                      <div className="flex items-center justify-between gap-3 px-1">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-foreground">
                            {formatFullDate(group.date)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {formatShiftCount(group.shifts.length)}
                          </p>
                        </div>
                        <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                          <span className="text-xs font-semibold">
                            {formatWeekday(group.date)}
                          </span>
                          <span className="text-lg font-bold leading-none">
                            {parseISODate(group.date).getDate()}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                        {group.shifts.map((shift) => (
                          <ShiftCard
                            key={shift.id}
                            shift={shift}
                            onEdit={openEditShift}
                            onDelete={deleteShift}
                            onTogglePaid={togglePaid}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                    <Table2 className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">
                      Nenhum plantão encontrado
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Ajuste os filtros ou registre o próximo plantão.
                    </p>
                  </div>
                  <Button onClick={() => openNewShift()}>
                    <Plus className="size-4" />
                    Novo plantão
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent
            value="resumo"
            className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0"
          >
            {hasAmounts ? (
              <div className="grid grid-cols-2 gap-3 lg:col-span-2">
                <MetricCard
                  label="Já recebido"
                  value={formatCurrency(stats.receivedAmount)}
                  detail={`${stats.paid} plantões quitados`}
                  icon={<WalletCards className="size-5" />}
                  accentClassName="bg-emerald-50 text-emerald-700"
                />
                <MetricCard
                  label="A receber"
                  value={formatCurrency(stats.pendingAmount)}
                  detail={`${stats.pending} pendentes`}
                  icon={<CheckCircle2 className="size-5" />}
                  accentClassName="bg-amber-50 text-amber-700"
                />
              </div>
            ) : null}

            <Card className="border-[#F3D5DC] bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Por local</CardTitle>
                <CardDescription>
                  Apenas locais com plantões em {formatMonth(selectedMonth)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.byLocation.length > 0 ? (
                  stats.byLocation.map((item) => (
                    <ProgressRow
                      key={item.location}
                      label={item.location}
                      value={item.count}
                      detail={formatShiftCount(item.count)}
                      total={Math.max(stats.total, 1)}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum plantão registrado neste mês.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#F3D5DC] bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Por turno</CardTitle>
                <CardDescription>
                  Quantidade, horas e períodos trabalhados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.byType.length > 0 ? (
                  stats.byType.map((item) => {
                    const meta = SHIFT_BY_CODE[item.code]

                    return (
                      <div
                        key={item.code}
                        className="rounded-lg border border-rose-100 bg-rose-50/40 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
                              meta.tone,
                            )}
                          >
                            {item.code}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-bold text-foreground">
                              {meta.name}
                            </h3>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {formatShiftCount(item.count)} · {item.hours}h ·{" "}
                              {meta.period}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <ProgressRow
                            label="Participação no mês"
                            value={item.count}
                            detail={`${item.hours}h`}
                            total={Math.max(stats.total, 1)}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum turno registrado neste mês.
                  </p>
                )}
              </CardContent>
            </Card>

            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-rose-50 to-white p-3 text-left text-sm text-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-rose-50 lg:col-span-2"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg shadow-brand"
                style={{ background: "var(--gradient-brand)" }}
                aria-hidden
              >
                🦁
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-primary">
                  Declaração anual
                </span>
                <span className="block text-xs font-medium text-muted-foreground">
                  Para ver os rendimentos anuais, abra o <span className="font-semibold text-foreground">Perfil</span>.
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-primary" />
            </button>
          </TabsContent>

        </Tabs>
      </main>

      <SiteFooter className="mx-auto w-full max-w-[1180px] px-4 py-8 safe-bottom" />

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Perfil</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-2xl border border-[#F3D5DC] bg-gradient-soft p-4">
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold text-primary-foreground shadow-brand"
                style={{ background: "var(--gradient-brand)" }}
              >
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold text-foreground">
                  Olá, {session.firstName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Sessão ativa no Plantões da Gabi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-[#F3D5DC] bg-white px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Nome
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {session.fullName || session.firstName}
                </p>
              </div>
              <div className="rounded-xl border border-[#F3D5DC] bg-white px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  E-mail
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {session.email}
                </p>
              </div>
              <div className="rounded-xl border border-[#F3D5DC] bg-white px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Plantões
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {formatShiftCount(shifts.length)}
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-[#F3D5DC] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Resumo anual
                  </p>
                  <h3 className="text-base font-extrabold text-foreground">
                    Rendimentos
                  </h3>
                </div>
                <div className="grid gap-1">
                  <Label
                    htmlFor="profile-year"
                    className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Ano
                  </Label>
                  <Select
                    value={String(profileYear)}
                    onValueChange={(value) => setProfileYear(Number(value))}
                  >
                    <SelectTrigger id="profile-year" className="h-9 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div
                  className="rounded-xl px-3 py-3 text-primary-foreground shadow-brand"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                    Total anual
                  </p>
                  <p className="text-base font-extrabold">
                    {formatCurrency(annualStats.totalAmount)}
                  </p>
                  <p className="text-xs opacity-80">
                    {formatShiftCount(annualStats.total)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900/70">
                    PF
                  </p>
                  <p className="text-base font-extrabold text-amber-900">
                    {formatCurrency(annualStats.pfAmount)}
                  </p>
                  <p className="text-xs text-amber-900/80">
                    {annualStats.pfPct}% · {formatShiftCount(annualStats.pfCount)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/70">
                    PJ
                  </p>
                  <p className="text-base font-extrabold text-emerald-900">
                    {formatCurrency(annualStats.pjAmount)}
                  </p>
                  <p className="text-xs text-emerald-900/80">
                    {annualStats.pjPct}% · {formatShiftCount(annualStats.pjCount)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Pessoa Física</span>
                    <span className="text-muted-foreground">{annualStats.pfPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-amber-100">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${annualStats.pfPct}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Pessoa Jurídica</span>
                    <span className="text-muted-foreground">{annualStats.pjPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${annualStats.pjPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-rose-100" />

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Exportar planilha do ano
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["todos", "PF", "PJ"] as const).map((scope) => {
                    const subset =
                      scope === "todos"
                        ? annualStats.yearShifts
                        : annualStats.yearShifts.filter(
                            (shift) => (shift.personType ?? "PF") === scope,
                          )
                    const label = scope === "todos" ? "Todos" : scope
                    return (
                      <Button
                        key={scope}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={subset.length === 0}
                        onClick={() => exportYearCsv(subset, profileYear, scope)}
                      >
                        <Download className="size-4" />
                        {label}
                      </Button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  CSV pronto para Excel e Google Sheets.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setProfileOpen(false)
                handleLogout()
              }}
            >
              <LogOut className="size-4" />
              Sair da conta
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => setProfileOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>

        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar plantão" : "Novo plantão"}</DialogTitle>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSave}>
            <div className="grid gap-2">
              <Label htmlFor="shift-date">Data</Label>
              <Input
                id="shift-date"
                type="date"
                required
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Local</Label>
              <Select
                value={form.location}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    location: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-lg border border-rose-100 bg-rose-50/60 p-3">
                <Label htmlFor="new-location" className="text-xs text-muted-foreground">
                  Cadastrar outro local
                </Label>
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    id="new-location"
                    value={newLocationName}
                    placeholder="Ex.: HOSPITAL X"
                    onChange={(event) => setNewLocationName(event.target.value)}
                    onKeyDown={handleNewLocationKeyDown}
                  />
                  <Button
                    type="button"
                    variant="soft"
                    onClick={addCustomLocation}
                    disabled={!normalizeLocationName(newLocationName)}
                  >
                    <Plus className="size-4" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Turno</Label>
              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Turno"
              >
                {SHIFT_TYPES.map((shiftType) => {
                  const selected = form.kind === shiftType.code

                  return (
                    <button
                      key={shiftType.code}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        selected
                          ? "border-primary bg-rose-50 text-primary shadow-sm"
                          : "border-border bg-white hover:border-rose-200 hover:bg-rose-50",
                      )}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          kind: shiftType.code,
                        }))
                      }
                    >
                      <span className="block text-sm font-bold">{shiftType.code}</span>
                      <span className="block text-xs font-medium">
                        {shiftType.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {shiftType.period}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Tipo para ir</Label>
              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Tipo para ir"
              >
                {(["PF", "PJ"] as const).map((type) => {
                  const selected = form.personType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={cn(
                        "rounded-lg border p-3 text-sm font-semibold transition-colors",
                        selected
                          ? "border-primary bg-rose-50 text-primary shadow-sm"
                          : "border-border bg-white hover:border-rose-200 hover:bg-rose-50",
                      )}
                      onClick={() =>
                        setForm((current) => ({ ...current, personType: type }))
                      }
                    >
                      {type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                    </button>
                  )
                })}
              </div>
            </div>


            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="shift-amount">Valor</Label>
                <Input
                  id="shift-amount"
                  inputMode="decimal"
                  placeholder="Ex.: 600"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shift-notes">Observações</Label>
                <Input
                  id="shift-notes"
                  placeholder="Opcional"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-rose-100 bg-rose-50/70 p-4">
              <div>
                <Label htmlFor="paid">Recebi</Label>
                <p className="text-sm text-muted-foreground">
                  {form.paid ? "Marcado como recebido" : "Marcado como pendente"}
                </p>
              </div>
              <Switch
                id="paid"
                checked={form.paid}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    paid: checked,
                  }))
                }
              />
            </div>

            <Separator />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                <CheckCircle2 className="size-4" />
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App

