import { useEffect, useMemo, useState } from "react"
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sparkles,
  Sun,
  Table2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const SEEN_KEY_PREFIX = "plantoes-gabi:tutorial-seen:"

function storageKey(userId: string) {
  return `${SEEN_KEY_PREFIX}${userId}`
}

export function hasSeenTutorial(userId: string | undefined | null) {
  if (!userId || typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(storageKey(userId)) === "1"
  } catch {
    return true
  }
}

export function markTutorialSeen(userId: string) {
  try {
    window.localStorage.setItem(storageKey(userId), "1")
  } catch {}
}

type Step = {
  icon: React.ComponentType<{ className?: string }>
  eyebrow: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    eyebrow: "Bem-vinda",
    title: "Sua agenda de plantões, simples e segura",
    body: "Em poucos toques você organiza, acompanha valores e exporta tudo quando precisar.",
  },
  {
    icon: CalendarDays,
    eyebrow: "Passo 1",
    title: "Toque em um dia para adicionar um plantão",
    body: "Pelo calendário da aba Agenda, é só tocar na data desejada para registrar local, horário e pagamento.",
  },
  {
    icon: Table2,
    eyebrow: "Passo 2",
    title: "Veja e edite a lista na aba Plantões",
    body: "Filtre por local, pessoa ou status de pagamento. Tudo fica sincronizado entre seus dispositivos.",
  },
  {
    icon: BarChart3,
    eyebrow: "Passo 3",
    title: "Acompanhe o resumo financeiro",
    body: "Na aba Resumo você vê totais por mês e pode exportar em CSV para o seu controle.",
  },
  {
    icon: Sun,
    eyebrow: "Dica final",
    title: "Tema claro ou escuro, quando quiser",
    body: "O botão com o sol/lua, no topo da tela, alterna entre os temas com uma transição suave.",
  },
]

export function WelcomeTutorial({
  userId,
  firstName,
}: {
  userId: string
  firstName?: string
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!userId) return
    if (!hasSeenTutorial(userId)) {
      setOpen(true)
      setStep(0)
    }
  }, [userId])

  const total = STEPS.length
  const current = STEPS[step]!
  const isLast = step === total - 1
  const Icon = current.icon

  const greeting = useMemo(
    () => (firstName ? `Olá, ${firstName}!` : "Olá!"),
    [firstName],
  )

  function close() {
    markTutorialSeen(userId)
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogContent className="max-w-[min(420px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-3xl border-border/70 bg-card p-0 shadow-elevated">
        <div
          className="relative px-6 pb-5 pt-7 text-primary-foreground"
          style={{ background: "var(--gradient-brand)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/85">
            {greeting}
          </p>
          <p className="mt-1 text-sm font-medium text-primary-foreground/90">
            Um tour rápido em {total} passos
          </p>
          <div className="mt-4 flex items-center gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all",
                  i <= step ? "bg-primary-foreground" : "bg-primary-foreground/30",
                )}
              />
            ))}
          </div>
        </div>

        <div className="px-6 pb-2 pt-6">
          <div
            className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary shadow-sm ring-1 ring-border"
            aria-hidden
          >
            <Icon className="size-6" />
          </div>
          <DialogHeader className="space-y-2 text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary/80">
              {current.eyebrow}
            </p>
            <DialogTitle className="font-display text-xl leading-snug text-foreground sm:text-2xl">
              {current.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {current.body}
            </DialogDescription>
          </DialogHeader>

          {isLast ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-secondary/70 p-3 text-xs text-foreground">
              <Moon className="size-4 shrink-0 text-primary" aria-hidden />
              <span>Você pode trocar de tema a qualquer momento. Bons plantões!</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 pb-6 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={close}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Pular tutorial
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="gap-1"
            >
              <ChevronLeft className="size-4" />
              Voltar
            </Button>
            {isLast ? (
              <Button size="sm" onClick={close} className="gap-1.5">
                <CheckCircle2 className="size-4" />
                Começar
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                className="gap-1"
              >
                Próximo
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
