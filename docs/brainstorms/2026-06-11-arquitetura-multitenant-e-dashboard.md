# Brainstorm — Arquitetura multi-tenant + Dashboard (Zanone)

> Data: 2026-06-11 · Participantes: Augustus + Claude
> Pré-requisito de leitura: `CONTEXTO.md`, `docs/PROCESSO-FORK-NOVO-CLIENTE.md`

---

## O que vamos fazer (em 2 frases)

Migrar o modelo de "1 Supabase por cliente" para **1 banco compartilhado** onde cada
arena é isolada por `owner_id` (o código já faz isso). E evoluir o `billing-hub` que já
existe pra virar o painel central do Zanone — guardando a infra de cada arena e mostrando
quanto cada uma usa o sistema.

## Pra quem / por quê

- **Zanone (sócio):** quer um lugar só pra ver quantas arenas existem, como cada uma está
  usando o sistema, cobrar via Mercado Pago e não perder credencial/dado de ninguém.
- **Augustus:** projeta **15+ arenas** se der certo → escala que torna "1 banco por cliente"
  caro (cada cliente além do 2º = Supabase pago) e bagunçado (15 credenciais espalhadas).
- **Cliente final (arena, ex: Arena do Parque):** quer o sistema com a cara dela, funcionando.

## O que já existe (verificado no código — não suposição)

- **CRM (este repo):** isola dados por `owner_id` em TODOS os hooks + na rota pública
  `/reservar/[ownerId]` + nas policies RLS. → **já suporta várias arenas no mesmo banco hoje.**
- **`billing-hub` (repo privado `quadras-zanoni/billing-hub`, deployado):** já tem gestão de
  clientes/tenants (status, plano, vencimento), funil de leads comercial, e **Mercado Pago
  completo** (PIX, QR Code, webhook que libera acesso). O "dashboard do Zanone" é **evoluir
  isto**, não construir do zero.

## Decisões fechadas

| # | Decisão | Motivo |
|---|---------|--------|
| 1 | **Banco único compartilhado** pras arenas (isolamento por `owner_id`) | `[decidi eu — viabilidade]` Risco se errado: BAIXO. Confirmei isolamento em 8 hooks + policies. Custo fixo + telemetria de graça + 1 credencial em vez de 15. |
| 2 | Escala alvo: **15+ arenas** | Augustus |
| 3 | **Deploy próprio por arena** por enquanto (rebrand no código; o da Arena já está pronto) | White-label visual é o produto. App único com troca de cara automática fica pra depois (3-5 clientes). Nada do trabalho atual é descartado. |
| 4 | Dashboard = **evoluir o billing-hub** + credenciais/infra por arena + telemetria de uso | Augustus (escolheu os 2). MP já existe lá. |
| 5 | **2 bancos com papéis distintos:** billing-hub mantém o seu (controle/vendas/leads); arenas usam o banco compartilhado (operação). O dashboard lê os dois. | `[decidi eu]` Risco baixo. Separa "controle do negócio" de "dados operacionais dos clientes". |
| 6 | Sequência: banco compartilhado + 2 furos → **Arena no ar** → dashboard (credenciais+telemetria) | `[decidi eu, autorizado]` Arena primeiro destrava o teste do cliente mais rápido. |
| 7 | **1 login por arena** (dono + funcionários dividem o mesmo `owner_id`) | Augustus confirmou 2026-06-11. Não precisa hierarquia conta→arena nem tabela de membros. |

## Fora de escopo (anti-over-engineering — só entra se Augustus pedir)

- Domínio próprio por arena (`arenadoparque.com.br`) — decisão comercial/custo.
- App único com theming dinâmico (troca de cara automática) — futuro, 3-5 clientes.
- Alertas no dashboard ("arena sem uso há 7 dias", "venceu ontem") — futuro, ajuda retenção.

## Furos conhecidos / pré-requisitos (achados no advogado-do-diabo)

- **FURO 1 (segurança, bloqueante):** policies `public_read_bookings` e `public_insert_bookings`
  estão como `using(true)`/`with check(true)` → qualquer um lê/cria agendamento de qualquer
  arena via API. Inofensivo com 1 banco por cliente; **grave** num banco compartilhado.
  Tem que travar por `owner_id` da rota ANTES de juntar clientes.
- **FURO 2 (validação, bloqueante):** teste de isolamento — criar 2 arenas no banco
  compartilhado e provar que uma não enxerga a outra, antes de pôr cliente real.

## Pendente de Augustus `[revisar]`

- ~~Vários funcionários por arena?~~ → **RESOLVIDO (2026-06-11): 1 login por arena.**
- **Qual conta/org do Supabase** hospeda o banco compartilhado? (o projeto linkado aponta
  `quadras-dev`/org `ufjlspktgoqefyerswgw`; o doc de fork menciona outra org). Definir a oficial.
- **Acessos que vou precisar pra executar:** login Supabase (conta certa), Vercel CLI (não
  está instalado) + login `quadras-zanoni`, senha ADMIN do billing-hub.
