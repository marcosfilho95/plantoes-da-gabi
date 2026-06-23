import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  HelpCircle,
  MessageSquareHeart,
  MousePointerClick,
  Sparkles,
  Sun,
  Table2,
  User,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const SEEN_KEY_PREFIX = "plantoes-gabi:tutorial-seen:";

export function hasSeenTutorial(userId: string | undefined | null) {
  if (!userId || typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(`${SEEN_KEY_PREFIX}${userId}`) === "1";
  } catch {
    return true;
  }
}

export function markTutorialSeen(userId: string) {
  try {
    window.localStorage.setItem(`${SEEN_KEY_PREFIX}${userId}`, "1");
  } catch {
    return;
  }
}

type TabId = "agenda" | "plantoes" | "resumo";

type Step = {
  selector?: string;
  tab?: TabId;
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "auto";
  offsetY?: number;
};

const STEPS: Step[] = [
  {
    icon: Sparkles,
    eyebrow: "Boas-vindas",
    title: "Vamos conhecer a aplicação juntos?",
    body: "Em alguns passos eu vou destacar cada parte. Você pode pular quando quiser.",
  },
  {
    selector: '[data-tour="tabs"]',
    icon: MousePointerClick,
    eyebrow: "Navegação",
    title: "Três abas para tudo que importa",
    body: "Agenda, Plantões e Resumo. Vamos passar por cada uma.",
    placement: "bottom",
  },
  {
    tab: "agenda",
    selector: '[data-tour="calendar"]',
    icon: CalendarDays,
    eyebrow: "Agenda",
    title: "Calendário do mês",
    body: "Aqui você visualiza os dias com plantão. Use as setas do topo para trocar de mês.",
    placement: "top",
    offsetY: 112,
  },
  {
    tab: "agenda",
    selector: '[data-tour="add-hint"]',
    icon: MousePointerClick,
    eyebrow: "Adicionar",
    title: "Toque em um dia para registrar",
    body: "É só tocar na data desejada no calendário para abrir o formulário de plantão.",
    placement: "bottom",
  },
  {
    tab: "plantoes",
    selector: '[data-tour="plantoes-filter"]',
    icon: Filter,
    eyebrow: "Filtros",
    title: "Encontre rápido o que precisa",
    body: "Refine a lista por status de pagamento, local ou turno. Os filtros se combinam entre si.",
    placement: "bottom",
  },
  {
    tab: "plantoes",
    selector: '[data-tour="plantoes-list"]',
    icon: Table2,
    eyebrow: "Plantões",
    title: "Tudo que você registrou",
    body: "No topo, o resumo do mês e os botões para exportar em CSV. Abaixo vem a lista completa, onde você pode editar ou apagar cada plantão.",
    placement: "top",
  },
  {
    tab: "resumo",
    selector: '[data-tour="resumo-content"]',
    icon: BarChart3,
    eyebrow: "Resumo",
    title: "Seu controle financeiro",
    body: "Veja totais já recebidos e a receber, e exporte tudo em CSV quando precisar.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="theme-toggle"]',
    icon: Sun,
    eyebrow: "Tema",
    title: "Alterne claro e escuro",
    body: "Toque no botão Tema para alternar — a transição é suave, no ritmo do amanhecer.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="profile-btn"]',
    icon: User,
    eyebrow: "Perfil",
    title: "Seus dados e ajustes",
    body: "Aqui você gerencia seu perfil, vê o histórico anual e ajusta preferências.",
    placement: "bottom",
  },
  {
    tab: "agenda",
    selector: '[data-tour="feedback-card"]',
    icon: MessageSquareHeart,
    eyebrow: "Feedback",
    title: "Sua opinião move o app",
    body: "Na aba Agenda, no final, você encontra o card de feedback. Mande ideias, críticas ou elogios — leio todos.",
    placement: "top",
  },
  {
    selector: '[data-tour="tutorial-btn"]',
    icon: HelpCircle,
    eyebrow: "Dica",
    title: "Pode rever este tour quando quiser",
    body: "Toque no ícone de interrogação no topo da tela para abrir o tutorial novamente.",
    placement: "bottom",
  },
  {
    icon: CheckCircle2,
    eyebrow: "Tudo pronto",
    title: "Bons plantões!",
    body: "Você já pode começar. Qualquer dúvida, é só voltar aqui pelo botão de ajuda.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function getRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function WelcomeTutorial({
  userId,
  firstName,
  title,
  open,
  onOpenChange,
  setActiveTab,
}: {
  title?: "Dr." | "Dra." | null;
  userId: string;
  firstName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setActiveTab: (tab: TabId) => void;
}) {
  const closingTitle = title ? `Bons plantões, ${title.replace(/\.$/, "")}!` : "Bons plantões!";
  const stepsLocal = STEPS.map((s, i) =>
    i === STEPS.length - 1 ? { ...s, title: closingTitle } : s,
  );
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setMounted(true), []);

  // Reset to first step on open.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const total = STEPS.length;
  const current = stepsLocal[step]!;
  const isLast = step === total - 1;

  // Switch tab if required.
  useEffect(() => {
    if (!open) return;
    if (current.tab) setActiveTab(current.tab);
  }, [open, current.tab, setActiveTab]);

  // Locate target & update rect.
  const updateRect = useCallback(() => {
    if (!current.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(current.selector);
    if (!el) {
      setRect(null);
      return;
    }
    // Scroll into view (centered) before measuring.
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    // Wait a bit for scroll to settle.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setRect(getRect(el)));
    });
  }, [current.selector]);

  useLayoutEffect(() => {
    if (!open) return;
    setRect(null);
    // Allow tab switch / DOM to settle.
    const t = window.setTimeout(updateRect, 120);
    return () => window.clearTimeout(t);
  }, [open, step, updateRect]);

  useEffect(() => {
    if (!open) return;
    const handler = () => updateRect();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, updateRect]);

  const isMobile = useIsMobile();

  // Compute tooltip position.
  useLayoutEffect(() => {
    if (!open) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const node = tooltipRef.current;
    const tw = node?.offsetWidth ?? Math.min(360, vw - 24);
    const th = node?.offsetHeight ?? 220;
    const margin = 12;
    const gap = 14;

    // On mobile, dock the tooltip to the bottom so it never shifts as the
    // spotlight target moves — preventing the card from "walking" mid-tour.
    if (isMobile) {
      setTooltipPos({
        top: vh - th - margin,
        left: Math.max(margin, (vw - tw) / 2),
      });
      return;
    }

    if (!rect) {
      setTooltipPos({
        top: Math.max(margin, (vh - th) / 2),
        left: Math.max(margin, (vw - tw) / 2),
      });
      return;
    }

    const placement = current.placement ?? "auto";
    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const showBelow =
      placement === "bottom"
        ? true
        : placement === "top"
          ? false
          : spaceBelow >= th + gap + margin || spaceBelow >= spaceAbove;

    const baseTop = showBelow
      ? Math.min(vh - th - margin, rect.top + rect.height + gap)
      : Math.max(margin, rect.top - th - gap);
    const top = Math.min(Math.max(margin, baseTop + (current.offsetY ?? 0)), vh - th - margin);

    const centerLeft = rect.left + rect.width / 2 - tw / 2;
    const left = Math.min(Math.max(margin, centerLeft), vw - tw - margin);

    setTooltipPos({ top, left });
  }, [open, rect, current.placement, current.offsetY, step, isMobile]);

  function close() {
    markTutorialSeen(userId);
    onOpenChange(false);
  }

  const greeting = useMemo(() => (firstName ? `Olá, ${firstName}!` : "Olá!"), [firstName]);

  if (!mounted || !open) return null;
  const Icon = current.icon;

  const spotlightPadding = 10;
  const spotlightStyle: React.CSSProperties | undefined = rect
    ? {
        top: rect.top - spotlightPadding,
        left: rect.left - spotlightPadding,
        width: rect.width + spotlightPadding * 2,
        height: rect.height + spotlightPadding * 2,
      }
    : undefined;

  const overlay = (
    <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog">
      {/* Backdrop with spotlight cutout via box-shadow */}
      {rect ? (
        <>
          <div
            className="pointer-events-auto fixed rounded-2xl transition-all duration-300 ease-out"
            style={{
              ...spotlightStyle,
              border: "2.5px solid hsl(var(--primary))",
              boxShadow:
                "0 0 0 9999px rgba(6, 6, 18, 0.68), 0 0 0 4px hsl(var(--primary) / 0.18), 0 8px 28px -6px hsl(var(--primary) / 0.45)",
            }}
            onClick={() => {
              /* swallow clicks on highlighted area to prevent accidental nav */
            }}
          />
          {/* Pulsing halo */}
          <div
            className="pointer-events-none fixed rounded-2xl"
            style={{
              ...spotlightStyle,
              animation: "tour-pulse 1.8s ease-out infinite",
            }}
            aria-hidden
          />
        </>
      ) : (
        <div className="pointer-events-auto fixed inset-0 bg-[rgba(8,8,20,0.62)]" />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          "pointer-events-auto fixed w-[min(360px,calc(100vw-1.5rem))] origin-top rounded-3xl border border-border/70 bg-card text-card-foreground shadow-elevated",
          !isMobile && "transition-[top,left] duration-300 ease-out",
        )}
        style={{
          top: tooltipPos?.top ?? -9999,
          left: tooltipPos?.left ?? -9999,
        }}
      >
        <div
          className="flex items-start gap-3 rounded-t-3xl px-5 pb-4 pt-5 text-primary-foreground"
          style={{ background: "var(--gradient-brand)" }}
        >
          <span
            className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25"
            aria-hidden
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground/85">
              {step === 0 ? greeting : current.eyebrow}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-primary-foreground/90">
              Passo {step + 1} de {total}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar tutorial"
            className="grid size-7 shrink-0 place-items-center rounded-full bg-white/15 text-primary-foreground transition-colors hover:bg-white/25"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2 px-5 pb-2 pt-4">
          <h3 className="font-display text-lg font-semibold leading-snug text-foreground sm:text-xl">
            {current.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{current.body}</p>
        </div>

        <div className="px-5 pb-3 pt-2">
          <div className="flex items-center gap-1" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  i < step ? "bg-primary/70" : i === step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={close}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Pular
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
                Concluir
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
      </div>

      <style>{`
        @keyframes tour-pulse {
          0% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0.7); }
          70% { box-shadow: 0 0 0 22px hsl(var(--primary) / 0); }
          100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0); }
        }
      `}</style>
    </div>
  );

  return createPortal(overlay, document.body);
}
