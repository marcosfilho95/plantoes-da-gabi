import { useState } from "react"
import { Heart, MessageSquareHeart, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SiteFooter } from "@/components/site-footer"
import { toast } from "sonner"

const FEEDBACK_EMAIL = "felixmarcos.dev@gmail.com"

export function FeedbackCard({
  fromName,
  fromEmail,
}: {
  fromName?: string
  fromEmail?: string
}) {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")

  function handleSend() {
    const t = title.trim()
    const m = message.trim()
    if (!t || !m) {
      toast.error("Preencha o título e a mensagem para enviar.")
      return
    }
    const subject = `[Plantões da Gabi] ${t}`
    const bodyLines = [
      m,
      "",
      "—",
      fromName ? `Enviado por: ${fromName}` : null,
      fromEmail ? `E-mail: ${fromEmail}` : null,
    ].filter(Boolean)
    const body = bodyLines.join("\n")
    const href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = href
    toast.success("Abrindo seu app de e-mail…", {
      description: "É só revisar e tocar em enviar.",
    })
  }

  return (
    <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
      <CardHeader className="gap-2 bg-gradient-soft">
        <div className="flex items-center gap-2.5 text-primary">
          <span
            className="grid size-9 place-items-center rounded-xl text-primary-foreground shadow-brand"
            style={{ background: "var(--gradient-brand)" }}
          >
            <MessageSquareHeart className="size-4" aria-hidden />
          </span>
          <CardTitle className="text-base font-extrabold tracking-tight">
            Sua opinião importa
          </CardTitle>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Esta aplicação é{" "}
          <strong className="text-foreground">100% gratuita</strong>. O propósito
          é simples: facilitar a rotina de quem é da medicina, organizando
          plantões e finanças em um só lugar. Sua crítica ou ideia é o que
          mantém o app vivo e evoluindo.
        </p>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-2">
          <Label htmlFor="feedback-title">Título</Label>
          <Input
            id="feedback-title"
            value={title}
            maxLength={80}
            placeholder="Ex.: Sugestão para o calendário"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="feedback-message">Mensagem</Label>
          <Textarea
            id="feedback-message"
            value={message}
            maxLength={1500}
            rows={5}
            placeholder="Conte o que está funcionando bem, o que poderia melhorar ou alguma ideia nova…"
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="text-right text-[11px] tabular-nums text-muted-foreground">
            {message.length}/1500
          </p>
        </div>

        <Button type="button" onClick={handleSend} className="w-full gap-2">
          <Send className="size-4" />
          Enviar feedback
        </Button>

        <div className="rounded-2xl border border-border/70 bg-gradient-soft p-4">
          <div className="flex items-start gap-2.5">
            <Heart
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Fortaleça este trabalho
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Como o app é gratuito, o maior apoio é seguir e compartilhar o
                trabalho do desenvolvedor — isso mantém o projeto vivo e
                ajudando mais pessoas da medicina.
              </p>
            </div>
          </div>
          <SiteFooter className="mt-4" />
        </div>
      </CardContent>
    </Card>
  )
}
