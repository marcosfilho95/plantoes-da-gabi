import { useState } from "react"
import { Heart, Send, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SiteFooter } from "@/components/site-footer"
import { toast } from "sonner"

const FEEDBACK_EMAIL = "marcosfilhoo123@gmail.com"

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
        <div className="flex items-center gap-2 text-primary">
          <span
            className="grid size-8 place-items-center rounded-xl text-primary-foreground shadow-brand"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Sparkles className="size-4" aria-hidden />
          </span>
          <CardTitle className="text-base font-extrabold">Sua opinião importa</CardTitle>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Esta aplicação é <strong className="text-foreground">100% gratuita</strong>. O
          objetivo é simples: facilitar a vida de quem é da medicina, ajudando a
          organizar plantões e o financeiro em um só lugar. Se tiver crítica, ideia
          ou melhoria, manda ver — é assim que ela fica melhor.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
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
          <p className="text-[11px] text-muted-foreground">
            {message.length}/1500
          </p>
        </div>

        <Button type="button" onClick={handleSend} className="w-full gap-2">
          <Send className="size-4" />
          Enviar feedback
        </Button>

        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Heart className="size-4 text-primary" aria-hidden />
            Fortaleça esse trabalho
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Como a aplicação é gratuita, o maior apoio é seguir e compartilhar o
            trabalho do desenvolvedor nas redes — isso ajuda a manter o projeto vivo
            e a chegar em mais pessoas da medicina.
          </p>
          <SiteFooter className="mt-3" />
        </div>
      </CardContent>
    </Card>
  )
}
