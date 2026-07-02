# Plano: Migração multi-tenant + Dashboard (Zanone) — 2026-06-11

> Origem: `docs/brainstorms/2026-06-11-arquitetura-multitenant-e-dashboard.md`. Executor: **squad** (fase de segurança) · operação manual (infra) · squad no repo `billing-hub` (dashboard, fase posterior).

## Pra você (camada humana)

**O que vamos fazer:** preparar o sistema pra rodar várias arenas num banco só (em vez de um banco por cliente), sem que uma arena veja os dados da outra — e depois transformar o painel que já existe (billing-hub) no centro de controle do Zanone.

**A ordem (4 fases):**

1. **Trancar as portas (código, AGORA):** hoje a tela pública de reserva deixa qualquer pessoa, pela internet, ler os agendamentos e os dados de cliente (nome, telefone) de *qualquer* arena. Num banco compartilhado isso seria um vazamento entre clientes. Essa fase fecha esse buraco e prova, com teste, que uma arena não enxerga a outra. **É a única que dá pra disparar já — não depende de senha nenhuma.**
2. **Criar o banco compartilhado (infra):** crio o banco único, instalo a estrutura nele já com as portas trancadas.
3. **Arena do Parque no ar (infra):** publico a Arena apontando pro banco compartilhado, cadastro ela como cliente no billing-hub → sai a URL pro Bim mandar pra Suany testar.
4. **Painel do Zanone (código, depois):** evoluo o billing-hub pra guardar a "ficha técnica" de cada arena (endereço do site, login) e mostrar quanto cada uma usa o sistema (nº de reservas, vendas, se está ativa). Cobrança via Mercado Pago já existe lá.

**O que muda pra você:** a partir daqui, cada cliente novo não precisa mais de um banco próprio (economiza dinheiro e some com a bagunça de credenciais). O Zanone passa a ver tudo num lugar só.

**Riscos (em valor):**
- A tela pública de reserva é o que o cliente final usa — se a Fase 1 for mal feita, ela pode parar de funcionar. Por isso vai com review-first e teste antes de qualquer cliente entrar.
- Banco compartilhado: se um dia o banco cair, cai pra todas as arenas (no modelo antigo caía só uma). Trade-off aceito por causa da escala de 15+.

**Não entra agora:** domínio próprio por arena · app único que troca de cara sozinho · alertas automáticos no dashboard.

**Custo estimado de agentes (grosso):**
- Fase 1: tarefa única, código sensível → squad solo + escalação a revisor por ser segurança = ~2–4 agentes. Gasto **baixo-médio**.
- Fase 4 (depois): maior, ganha seu próprio brief quando chegar a vez.
- Fases 2 e 3 são operação manual minha (não gastam agentes), mas **dependem de você** (abaixo).

**Pendente de você `[revisar]`:**
- `[revisar]` Qual conta/org do Supabase hospeda o banco compartilhado (o linkado é `quadras-dev`; o doc de fork cita outra). Define antes da Fase 2.
- `[revisar]` Login do Vercel como `quadras-zanoni` + senha ADMIN do billing-hub. Precisa pras Fases 3 e 4.
- ✅ 1 login por arena — confirmado.

---

## Pro agente (camada técnica — Quality Brief / squad — FASE 1 só)

```
Objetivo:
  Endurecer o acesso público da página de reserva pra o banco poder ser
  compartilhado entre várias arenas (owner_id) sem vazar dados de uma pra outra.

Contexto (com evidência):
  - Isolamento autenticado já existe: RLS owner_all_* por auth.uid()=owner_id
    em todas as tabelas (supabase/migrations/0001_init.sql:101-129).
  - BURACO: policies públicas abertas demais —
      public_read_bookings  = using(true)        (0001_init.sql:125)
      public_insert_bookings = with check(true)  (0001_init.sql:126)
      public_read_active_courts = using(status='ativa')  (0001_init.sql:129)
    → anon lê bookings (com client_name/client_phone) e courts de TODAS as arenas;
      anon insere booking pra qualquer owner_id.
  - Consumidor: src/app/reservar/[ownerId]/page.tsx faz query direta anon —
      courts por owner_id (:92,:121) · bookings por owner_id (:173) · insert (:195).
    O cliente que reserva NÃO é autenticado (anon) → solução não pode usar auth.uid().

Contrato:
  inputs:  ownerId (da rota /reservar/[ownerId]), date
  outputs: página pública expõe SÓ — quadras ativas do ownerId + horários OCUPADOS
           do ownerId (court_id+date+start_time+end_time, sem dados de cliente);
           cria booking só pra aquele ownerId.
  erros:   ownerId inexistente → estado vazio amigável; leitura de outra arena → negada.
  FORBIDDEN:
    - anon ler client_name/client_phone de qualquer booking;
    - anon listar bookings/courts sem ownerId, ou de outro owner;
    - alterar as policies owner_all_* (fluxo autenticado do painel intacto);
    - tocar register_sale / lógica de vendas;
    - git --force / --no-verify / reset --hard / commit automático.

Riscos:
  - reservar/[ownerId]/page.tsx é o fluxo do cliente final — refatorar o acesso
    (RPC SECURITY DEFINER ou view sem colunas sensíveis) pode quebrar a tela. Regressão alta.
  - RLS restrito demais pode quebrar o painel autenticado (owner_all_*).

Testes:
  happy:       anon em /reservar/[A] vê quadras+horários ocupados de A e cria reserva em A.
  edge:        ownerId inexistente; data sem reservas.
  failure:     anon SELECT em bookings sem filtro / de outra arena → vazio ou erro,
               NUNCA client_name/phone; anon insert em owner alheio → bloqueado p/ contrato.
  isolation:   2 arenas (A,B) no mesmo banco — logado como A não vê nada de B; anon não cruza.
  regression:  painel autenticado (owner) faz CRUD normal; venda transacional intacta.

Pronto-quando:
  - nova migration idempotente (0003_*) remove/substitui as policies públicas inseguras
    e expõe acesso público MÍNIMO (RPC SECURITY DEFINER ou view) sem colunas sensíveis;
  - reservar/[ownerId]/page.tsx adaptado ao novo acesso, funcionando no dev (localhost:3000);
  - teste de isolamento 2-arenas passa;
  - npm run build + npx tsc --noEmit limpos · lint sem erro novo;
  - diff revisado em contexto limpo. PARADO no diff (não commita).
```

---

## Fases seguintes (resumo — detalham quando chegar a vez)

**Fase 2 — Infra (operação minha, depende do `[revisar]` da org Supabase):**
criar Supabase compartilhado → `supabase db query` dos migrations `0001` + `0002` + `0003` → validar.

**Fase 3 — Infra (operação minha, depende de Vercel login + senha admin):**
`npm i -g vercel` + login `quadras-zanoni` → deploy da Arena (`preview/arena-do-parque`) com
env `NEXT_PUBLIC_SUPABASE_*` = banco compartilhado + `BILLING_HUB_URL`/`BILLING_TENANT_KEY` →
cadastrar tenant `arena-do-parque` no `billing-hub-six.vercel.app/admin` (status trial) → URL testável.

**Fase 4 — Dashboard (squad no repo `quadras-zanoni/billing-hub`, fase posterior):**
schema `tenants` ganha campos de infra por arena (`vercel_url`, `owner_id`, `repo`) +
UI no `TenantDetail`; telemetria lê o banco compartilhado (service-role) agregando por
`owner_id` (nº bookings/vendas/última atividade). Brief próprio quando começar.

---

## Comando pra disparar (Fase 1 só — quando você quiser)

`/squad docs/plans/2026-06-11-multitenant-e-dashboard.md` (escopo: **Fase 1 — Quality Brief acima**)
