## Recomendação técnica primeiro

Você pediu para migrar do blob `app_data` para as tabelas reais `shifts`/`locations`. Reli o código: o `App.tsx` tem 3873 linhas e o estado (`shifts`, `shiftTemplates`, `locations`) é manipulado em ~80 pontos, com vários campos que **não existem** na tabela `shifts` atual (`kind`, `paid`, `expectedPaymentDate`, `paymentDate`, `netAmount`, `deductions`, `invoiceNumber`, `paymentNotes`, `personType`, `shiftTemplates` inteira). Migrar pra CRUD por linha exige:
- Adicionar ~10 colunas em `shifts` + criar tabela `shift_templates`
- Reescrever toda a camada de estado pra ações assíncronas individuais
- Risco alto de regressão em features hoje funcionando (recibos, CSV, agrupamentos)

**Recomendo o caminho equivalente porém seguro:** manter o blob `app_data`, mas torná-lo a fonte primária *de verdade* com fila offline robusta. O objetivo do seu pedido ("não perder dados ao limpar cache, Supabase como fonte de verdade") é 100% atendido — a diferença é só implementação interna invisível pro usuário. Se quiser depois, dá pra fazer a migração por linha em etapas.

**Se mesmo assim quiser CRUD por linha agora**, me responde e eu refaço o plano (vai exigir várias iterações).

## Plano (caminho recomendado)

### 1. Schema: blindar `app_data`
- Adicionar RLS na `app_data` com policy `id = auth.uid()::text`, GRANTs para `authenticated`
- Coluna `updated_at` já existe; usar como "último backup"
- Cliente passa a ler/escrever **direto** pelo `supabase` client (RLS), eliminando a rota `/api/app-data` e o uso de `service_role` pra esse caminho

### 2. Camada de persistência (`src/lib/sync.ts`, novo)
- `loadRemote(userId)` → busca `app_data` pelo Supabase client
- `pushRemote(userId, payload)` → upsert com `updated_at`
- Fila local em `localStorage` (`pending_sync`): grava snapshot + timestamp sempre que falha
- Status: `idle | syncing | offline | error` + `lastSyncedAt` + `pendingCount`
- Listener `online`/`visibilitychange` re-tenta automaticamente

### 3. Refator no `App.tsx` (cirúrgico, só na seção de sync ~linhas 1393-1477)
- Trocar `apiRequest("/api/app-data")` pelo client Supabase via `sync.ts`
- Toda mutação local dispara `pushRemote` imediato (não mais só debounce de 400ms)
- Em falha: marca `pending_sync`, mantém dados locais, mostra aviso (sem apagar nada)

### 4. UI de sincronização (componente `<SyncStatus />`)
- Indicador discreto no header: ✓ Sincronizado · ⏳ Sincronizando · ⚠ N pendentes · ⛔ Offline
- Último backup: "Há 2 min" / data
- Botão **"Sincronizar agora"** quando há pendências ou erro
- Texto atual "Não foi possível sincronizar…" some quando tudo está sincronizado

### 5. PWA com auto-update (`vite-plugin-pwa`)
- `bun add -D vite-plugin-pwa`
- `registerType: "autoUpdate"`, `NetworkFirst` para HTML, `CacheFirst` só pros assets hashados
- Wrapper de registro com guardas: só registra em produção, fora de iframe/preview, com kill-switch `?sw=off`
- Toast "Nova versão disponível — recarregar" quando detecta update
- Remover o `<link rel="manifest">` manual atual (o plugin gera)

### 6. Erro "This page didn't load" em produção
Os logs mostram `400: Invalid Refresh Token: Refresh Token Not Found` recente. O `ErrorComponent` está disparando porque algum hook está throwing durante SSR/hidratação quando o token expira. Vou:
- Confirmar que `__root.tsx` não toca em Supabase no SSR
- Garantir que o listener `onAuthStateChange` trate `TOKEN_REFRESHED` falho limpando a sessão sem throw
- Logar o erro real antes do fallback HTML

### 7. Limpar
- Apagar tabela `app_data` legacy? **Não** — manter, agora com RLS, é onde os dados ficam
- Remover `src/routes/api/app-data.ts` (não mais usado)
- Tabelas `shifts`/`locations` ficam ociosas; posso dropá-las ou deixar pra migração futura

### Sobre Vercel → Lovable e GitHub
Não consigo executar. No editor Lovable:
1. **+** (canto do chat) → **Publish** → republica em `plantoesdagabi.lovable.app`
2. **+** → **GitHub → Connect project** já está conectado; o sync é bidirecional, então o repo já reflete o código atual
3. Na Vercel, desconectar o projeto ou apontar o domínio customizado pro Lovable

---

### Detalhes técnicos
- RLS `app_data`: `USING (id = auth.uid()::text) WITH CHECK (id = auth.uid()::text)`
- Fila offline: `{snapshot, queuedAt}` em `pwa-sync-queue` (separado do estado, não conflita com state)
- Hash dos assets: já tem (Vite gera por padrão)
- `start_url: "/"` no manifest — não mudar pra não invalidar instalações iOS existentes
