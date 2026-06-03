# Plano: Redesign clean/claro do CRM Quadras — 2026-06-03

> Origem: decisão na conversa (Augustus) + imagem de referência `REF.png` (dashboard gerado no Codex). Executor: **devteam** (global em `Desktop/devteam`).

## Pra você (camada humana)

- **O que vamos fazer:** trocar a "pele" do sistema inteiro — sair do dark/neon e ir pro **clean e claro** da imagem que você gerou. Profissional, sóbrio, a cara de software de gestão de verdade.
- **Ordem (e por que assim):**
  1. **Fundação** — definir as cores, a fonte e as "peças de Lego" (botões, cards, etiquetas, menu lateral) no estilo novo. É o molde. **Já deixo preparado pro botão claro/escuro do futuro** (só faltará ligar).
  2. **Dashboard** — deixar igual à tua imagem. É a tela-referência: quando ela estiver aprovada, as outras copiam o mesmo DNA.
  3. **Demais telas internas** — agenda, agendamentos, quadras, clientes, estoque, movimentações, vendas, relatório, link do cliente.
  4. **Telas públicas** — login, cadastro, tela de bloqueio e a página de reserva (hoje estão neon, viram claras).
- **O que muda pra você:** o app inteiro fica claro e coeso. Os painéis que pedem dado que ainda não existe (lucro/despesas, planos de cliente, "+2 vs ontem", notificações) entram como **"em breve" honesto** — bonitos, mas sem inventar número falso.
- **Riscos (em valor):** é mexer em muita tela de uma vez. Risco de alguma sair torta até você revisar. Mitigação: **fundação + dashboard primeiro, você aprova, só então propago** pro resto. Nada vai pro ar sozinho — paro no código pra você olhar.
- **Não entra agora:** nenhuma feature nova (lucro/despesas, planos, notificações, multi-unidade, o toggle claro/escuro em si). Só o visual. Essas viram conversa separada depois.
- **Custo estimado de agentes:** ver seção no fim. Resumo: ~12–16 dispatches sequenciais (devteam não paraleliza na V0.1), gasto médio-alto. Faço em levas e te mostro o dashboard antes de gastar com o resto.
- **Pendente de você:** `[revisar]` bater o martelo na direção visual abaixo (o Design System) — depois disso eu toco.

---

## Pro agente (camada técnica — formato devteam / spec pro planner)

```
objetivo:
  Migrar a identidade visual do CRM Quadras de dark/neon (Orbitron + magenta/violet/cyan)
  para clean/claro (Inter + base cinza-clara, marca teal, ação violet), fiel ao REF.png.
  Trabalho é de PELE (theming + recomposição visual), não de regra de negócio.

contexto (com evidência):
  - Stack: Next 16 (App Router, Turbopack) + React 19 + Tailwind v4 (@import "tailwindcss") + TS.
  - Tema atual nasce em src/app/globals.css (CSS vars dark + Orbitron/Rajdhani) e
    src/app/layout.tsx:7-18 (next/font Orbitron+Rajdhani). É AÍ que a fundação muda.
  - Componentes UI base: src/components/ui/{Button,Card,Input,Badge,Modal}.tsx e
    src/components/layout/{Sidebar,AuthGuard}.tsx. Recolorir aqui propaga pra quase tudo.
  - Telas internas (src/app/(panel)/*) JÁ usam classes claras hardcoded (bg-white,
    text-gray-900) — ver evidência: vendas/page.tsx:117, estoque/page.tsx, agenda/page.tsx.
    Hoje ficam ilegíveis porque o LAYOUT é escuro. Com fundação clara, muitas se aproximam
    do certo só trocando o fundo — mas precisam subir de nível visual pro padrão do REF
    (cards, badges soft, espaçamento, paleta teal/violet).
  - Telas dark-neon que precisam virar claras do zero: login, cadastro, subscription,
    reservar/[ownerId]/page.tsx, dashboard/page.tsx.
  - Dados reais disponíveis: bookings, courts, products(min_stock), sales, clients,
    stock_movements (via hooks src/hooks/*). NÃO existe: despesas/lucro, planos de cliente,
    histórico p/ deltas "vs ontem", notificações, multi-unidade.

arquivos_provaveis:
  FUNDAÇÃO (fatia 0 — bloqueante, faço/superviso eu como orchestrator):
    - src/app/globals.css            (tokens: :root light + scaffolding .dark vazio; remover Orbitron)
    - src/app/layout.tsx             (next/font: Inter; trocar var fonts)
    - src/app/(panel)/layout.tsx     (bg claro; já tem fix de billing — não regredir)
    - src/components/layout/Sidebar.tsx
    - src/components/ui/Button.tsx · Card.tsx · Input.tsx · Badge.tsx · Modal.tsx
  DASHBOARD (fatia 1 — referência):
    - src/app/(panel)/dashboard/page.tsx  (recompor 1:1 com REF; placeholders honestos)
    - novos componentes de dashboard conforme necessário (ex: OccupancyDonut, AgendaTimeline,
      CourtStatusCard, FinanceChart, StockBar) — SVG puro p/ donut/barra; lib leve só se a
      line-chart justificar (decisão do dev na fatia, registrar).
  DEMAIS TELAS (fatias 2..N — uma por tela, herdam o molde):
    - (panel)/agenda · agendamentos/novo · quadras · clientes · estoque ·
      movimentacoes · vendas · relatorio · link-cliente
  PÚBLICAS (fatias finais):
    - login · cadastro · subscription/SubscriptionClient.tsx · reservar/[ownerId]

contrato (DESIGN SYSTEM — o molde, não-negociável; cada dev SEGUE, não reinventa):
  tokens (CSS vars em globals.css :root, com .dark scaffolded p/ futuro toggle):
    --bg:#F6F7F9  --surface:#FFFFFF  --surface-2:#F1F3F5  --border:#E8EBED
    --text:#1E293B  --text-muted:#64748B  --text-subtle:#94A3B8
    --brand:#14B8A6  --brand-weak:#E6F7F4      (marca + item de menu ativo)
    --primary:#7C3AED  --primary-hover:#6D28D9 (ação principal: "Novo agendamento")
    --success:#10B981  --warning:#F59E0B  --danger:#EF4444  --info:#3B82F6  --violet:#8B5CF6
    --radius-card:12px  --radius-ctl:8px  --radius-pill:999px
    --shadow-card: 0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)
  tipografia: Inter (next/font), títulos 600, números 700, corpo 400/500. SEM Orbitron/Rajdhani.
  componentes:
    - Card: surface branco, border --border, radius-card, shadow-card, padding 20px.
    - StatCard: ícone em quadrado pastel (cor soft do tema do card) + label muted + número 700
      + linha de delta (placeholder "—" quando não há histórico).
    - Badge: pill SOFT (bg cor/10%, texto cor) — success/warning/danger/info/violet.
    - Button: primary = --primary sólido texto branco; secondary = surface + border; ghost.
    - Sidebar: surface branca, item ativo = bg --brand-weak + texto --brand + barra/indicador;
      logo "QUADRAS / GESTÃO INTELIGENTE" com ícone quadrado teal; rodapé com user.
    - Inputs/Select/Textarea: surface, border --border, foco ring --brand. Remover color-scheme:dark.
  inputs · outputs: telas continuam consumindo os mesmos hooks/props — SÓ markup/estilo muda.
  erros esperados: nenhum novo fluxo; manter toasts/erros existentes (não regredir os fixes
    de billing-gate e error-handling já mergeados na branch fix/bugs-criticos).
  FORBIDDEN:
    - inventar dado: painéis sem fonte (lucro/despesas, planos, deltas "vs ontem",
      notificações, multi-unidade) → empty-state "em breve", NÃO número mockado.
    - mudar schema, hooks de dados, RLS, middleware ou lógica de negócio.
    - reintroduzir cor hardcoded fora dos tokens (nada de #6b2cff/#ff00d4/bg-white solto).
    - tocar Desktop/squad/* ; commit automático ; --force/--no-verify/reset --hard.

riscos:
  - Tailwind v4 usa @theme/@import — confirmar como os tokens viram utilitários antes de
    espalhar classes (risco de classe inexistente). Evidência: globals.css:1 (@import "tailwindcss").
  - (panel)/layout.tsx tem o gate de billing recém-corrigido — não regredir (layout.tsx:9-18).
  - 13 telas: risco de drift de estilo entre dispatches → mitigado pelo Design System fixo +
    fundação/dashboard aprovados ANTES de propagar.
  - Charts: line-chart pode puxar dependência — manter o mais leve possível, isolar em componente.

nao_goals:
  - Nenhuma feature nova (despesas/lucro, planos, notificações, multi-unidade, toggle dark on).
  - Sem refactor de lógica/estado. Sem testes de regra de negócio novos (é visual).
  - Sem deploy, sem commit (parar no diff).

criterios_pronto:
  - npm run build (next build) compila; tsc --noEmit limpo em src/; lint sem erros NOVOS.
  - Inspeção visual no dev server (localhost:3000, admin@quadras.dev) tela a tela:
    sem texto ilegível, sem branco/dark destoante, paleta = Design System.
  - Nenhuma cor neon/Orbitron remanescente (grep por #6b2cff|#ff00d4|#00d9ff|Orbitron = 0).
  - Fixes da branch fix/bugs-criticos intactos.
  - Diff revisado pelo reviewer em contexto limpo. Parado no diff.
```

---

## Execução PARALELA (decisão Augustus 2026-06-03 — urgência: white-label pronto hoje)

Abandonamos o sequencial do devteam V0.1 em favor de paralelização real, porque o trabalho
é naturalmente paralelizável (1 tela = 1 arquivo) DESDE QUE o molde exista primeiro.

- **Fase A (sequencial, orchestrator/eu):** Fundação — tokens (globals.css), Inter (layout),
  componentes base (Button/Card/Badge/Input/Modal/Sidebar), bg do panel layout. **+ Dashboard
  1:1 REF.** Congela o molde. Gate (build/tsc). É o caminho crítico; ninguém paraleliza antes.
- **Fase B (paralelo, ~3–4 agentes frontend por leva):** cada agente recebe (1) o Design System
  acima, (2) os componentes base já prontos, (3) o dashboard pronto como exemplo visual, e
  reconstrói EXATAMENTE 1 tela (seu page.tsx). Arquivos disjuntos → sem conflito de merge.
  Agentes de tela NÃO tocam globals/componentes base/layout (já congelados na Fase A).
  - Leva B1 (internas): agenda · agendamentos/novo · quadras · clientes · estoque
  - Leva B2 (internas+públicas): movimentacoes · vendas · relatorio · link-cliente
  - Leva B3 (públicas): login · cadastro · subscription · reservar/[ownerId]
- **Fase C (orchestrator/eu):** gate final (build + tsc --noEmit + lint) + revisão visual tela a
  tela no dev server + screenshots pro Augustus. Parar no diff.

Guarda-corpos do paralelo: molde congelado antes de fan-out; cada agente = 1 arquivo-alvo
declarado; agente que precisar de componente compartilhado novo → escala pro orchestrator
(não cria solto). Gate só no fim de cada leva (evita lock concorrente do .next).

## Estimativa de custo (grosso)

- ~13 telas. Fase A (eu, ~fundação+dashboard). Fase B = ~10 agentes frontend em 3 levas paralelas.
- Gasto **médio-alto** concentrado, mas wall-clock muito menor que sequencial. Aceito pelo Augustus
  dada a urgência (cliente do Zanoni esta semana).

## Comando pra disparar

Aprovado (Augustus deu sinal verde pra paralelizar + acelerar). Orchestrator executa Fase A já,
para no diff do dashboard pra Augustus ver a direção, e segue pras levas paralelas B.
