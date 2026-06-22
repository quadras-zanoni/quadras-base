# Quadras Base — Design

**Data:** 2026-06-22
**Status:** Aprovado para implementação

## 1. Visão geral

`quadras-base` é o produto SaaS que vamos vender para arenas esportivas (futsal, society, beach tennis etc.) para controlar quadras, agendamentos, clientes, estoque/vendas e financeiro. É um único sistema multi-tenant: cada arena-cliente é um *tenant* dentro do mesmo app, não um fork/deploy separado.

Referência funcional usada para este design: protótipo `arena-do-parque.vercel.app` (capturas de tela de 2026-06-22). O nome e a logo "Arena do Parque" são só dados de teste daquele protótipo — não usamos aqui.

Não temos nenhum cliente ativo nesta v1; ela nasce já pronta para receber o primeiro cliente real.

## 2. Arquitetura

- **App único** em Next.js (App Router), deploy na Vercel. Rotas de API como Vercel Functions.
- **Banco único** no Supabase (Postgres + Auth). Toda tabela de negócio tem `tenant_id`; Row Level Security garante isolamento entre arenas.
- **Resolução de tenant**: Routing Middleware lê o subdomínio (`<slug>.quadrashub.app`) antes da renderização e injeta o tenant no contexto da request. Domínio próprio por cliente é suportado depois via Vercel Domains, sem mudança de arquitetura.
- **Repositório**: um único repo, um único deploy contínuo. Sem fork por cliente.

## 3. Multi-tenant e branding (substitui a ideia de "fork por cliente")

Cada linha em `tenants` carrega a identidade visual daquela arena: `nome_exibicao`, `logo_url`, `cor_primaria`. Adicionar um cliente novo = criar uma linha em `tenants` com seus dados e marca — não um novo repositório, não um novo deploy.

Esta v1 (`quadras-base`) é o tenant "modelo": tema **preto e branco**, sem logo, com o texto "BASE" no lugar da marca. Serve de referência visual padrão e de ambiente de testes/demo.

## 4. Modelo de dados

| Tabela | Campos principais |
|---|---|
| `tenants` | `id`, `slug`, `nome_exibicao`, `logo_url`, `cor_primaria`, `whatsapp_avisos`, `token_link_publico`, `status_assinatura`, `criado_em` |
| `quadras` | `id`, `tenant_id`, `nome`, `tipo_esporte`, `preco_hora`, `ativa` |
| `clientes` | `id`, `tenant_id`, `nome`, `telefone`, `criado_em` (criado automaticamente ao agendar, se não existir) |
| `agendamentos` | `id`, `tenant_id`, `quadra_id`, `cliente_id`, `data`, `hora_inicio`, `hora_fim`, `status` (`confirmado`/`cancelado`), `origem` (`admin`/`link_publico`), `recorrente` (bool), `criado_em` |
| `produtos` | `id`, `tenant_id`, `nome`, `categoria`, `preco`, `quantidade_estoque`, `ativo` |
| `movimentacoes_estoque` | `id`, `tenant_id`, `produto_id`, `tipo` (`entrada`/`saida`), `quantidade`, `motivo`, `criado_em` |
| `vendas` | `id`, `tenant_id`, `cliente_id` (opcional), `forma_pagamento`, `valor_total`, `criado_em` |
| `venda_itens` | `id`, `venda_id`, `produto_id`, `quantidade`, `preco_unitario` |

Regras:
- Confirmar uma `venda` com itens gera uma `movimentacao_estoque` do tipo `saida` automaticamente e decrementa `produtos.quantidade_estoque`.
- `agendamentos.recorrente = true` marca um cliente com horário fixo semanal (mesmo dia/hora todo período); usado para projeção de receita fixa no relatório. Não há cobrança automática de mensalidade nesta v1 — é só marcação + cálculo.
- Receita do dia/mês = soma de `agendamentos` confirmados (quadra × duração × `preco_hora`) + `vendas`.

## 5. Módulos / Telas

Replicando a navegação validada no protótipo:

1. **Dashboard** — agendamentos hoje, confirmados, receita do dia, taxa de ocupação, quadras ativas, agenda de hoje, status das quadras, próximos agendamentos, resumo financeiro, clientes/planos, alerta de estoque baixo.
2. **Agenda do Dia** — por data, filtro por quadra e status, alternância lista/grade.
3. **Novo Agendamento** — escolher quadra, data, hora início/fim, status inicial, toggle "agendamento recorrente", cliente novo ou existente (nome + telefone).
4. **Quadras** — CRUD (nome, tipo de esporte, preço/hora, ativa/inativa).
5. **Clientes** — listagem com busca por nome/telefone; criação automática via agendamento.
6. **Estoque** — CRUD de produtos (nome, categoria, preço, quantidade, ativo/inativo), alerta de estoque baixo.
7. **Movimentações de Estoque** — histórico de entradas/saídas, criação manual (ex: reposição, perda).
8. **Vendas** — registrar venda (itens + forma de pagamento), histórico do dia.
9. **Relatório Financeiro** — receita do mês, receita por quadra, receita de produtos, cancelamentos, vendas por forma de pagamento, lista de agendamentos do mês.
10. **Link do Cliente** — link público tokenizado (`/r/<token>`) por tenant para autoagendamento, campo de WhatsApp de avisos, instruções de uso.

## 6. Fluxo: agendamento público + WhatsApp

1. Cliente final abre o link público (token do tenant), sem login.
2. Escolhe quadra, data e horário disponível (sistema bloqueia horários já ocupados).
3. Preenche nome e telefone.
4. Confirma → cria `agendamento` (`origem = link_publico`, `status = confirmado`) e `cliente` (se novo).
5. Ao confirmar, abre automaticamente um link `wa.me` no aparelho do próprio cliente, com mensagem pré-preenchida endereçada ao número cadastrado em `whatsapp_avisos` do tenant. Sem custo, sem API da Meta — decisão já validada.

## 7. Integração futura com Quadras Hub (billing)

`quadras-base` não integra Mercado Pago diretamente. Contrato esperado de um serviço externo ("Quadras Hub", a ser desenhado em spec separado):

- `GET /api/subscription/check?tenant=<slug>` → `{ ativo: boolean, dias_restantes: number }`
- `GET /api/subscription/pix?tenant=<slug>` → QR code PIX para renovação

Middleware do `quadras-base` consulta o `check` periodicamente; se `ativo = false`, redireciona para tela de bloqueio que busca o QR via `pix` e faz polling até confirmar pagamento. Esta v1 implementa o middleware e a tela de bloqueio contra um contrato mockado — a integração real acontece quando o Quadras Hub existir.

## 8. Segurança

- Autenticação via Supabase Auth (um usuário admin por tenant nesta v1; multi-usuário por tenant é extensão futura, schema já comporta via tabela de associação se necessário).
- RLS em todas as tabelas de negócio: políticas restringem linhas ao `tenant_id` do usuário autenticado.
- Rota pública de agendamento (sem login) usa uma function/role restrita que só pode inserir `agendamentos`/`clientes` do tenant do token e ler horários daquele tenant — nunca acesso geral à tabela.

## 9. Fora de escopo nesta v1

- Cobrança automática de mensalidade de horário fixo.
- Múltiplos usuários/papéis por tenant (só um admin por arena).
- Notificação via WhatsApp Business API (fica com o link `wa.me`).
- Domínio próprio por cliente (suportado pela arquitetura, configurado depois, não nesta entrega).

## 10. Testes

- Testes de unidade para regras de negócio críticas: cálculo de receita, decremento de estoque em venda, bloqueio de horário conflitante em agendamento.
- Teste de RLS: usuário do tenant A não pode ler/escrever dados do tenant B (via Supabase).
- Teste manual do fluxo público de agendamento ponta a ponta (link → reserva → aparece na Agenda do Dia → wa.me).
