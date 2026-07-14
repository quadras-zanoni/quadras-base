# Módulo Aulas / Professores — design — 2026-07-14

> Origem: 2 áudios da dona da Arena do Parque (Suany). Domínio: código + produto. Escopo: médio-grande (subsistema novo, mas com muito reuso).

## O que vamos fazer

Uma aba **"Aulas"** (separada de Clientes) onde a dona cadastra **professores** e agenda as **aulas** deles — avulsa ou recorrente (ex: toda segunda às 10) — reusando a agenda de reservas que já existe. Cada aula registra o **ganho da arena** (entra no faturamento) e, opcional, o **ganho do professor** (controle à parte). Um resumo por professor mostra quanto cada um faturou no período.

## Pra quem / por quê

A dona (Suany) já tem professores dando aula nas quadras. Hoje ela não tem onde registrar isso — controla na cabeça/papel. Ela quer: agendar as aulas (inclusive o mês inteiro de uma vez), saber quanto a arena fatura com cada professor, e poder mostrar pro professor quanto ele faturou. Evidência concreta: pediu por áudio, com nome real de professor ("Marcos Paulo") e o fluxo que imagina.

## Decisões fechadas

**Produto (Augustus decidiu):**
- **2 valores por aula:** *ganho da arena* (o que a arena cobra pela hora — entra no faturamento junto com reservas) + *ganho do professor* (opcional, à parte, não entra no caixa da arena — serve pra mostrar pro professor quanto ele faturou).
- **Sem login de professor** no MVP — a dona vê o resumo por professor e mostra pra ele. (Login de professor = fase 2 se validar.)
- **A aula ocupa a quadra** — é uma reserva de verdade: aparece na agenda, bloqueia o horário, respeita a trava de choque de horário.
- **Entra depois dos 3 ajustes** de comanda/venda que já estão sendo codados.
- **Extras aprovados (todos):** filtro de período no resumo do professor · etiqueta/cor "Aula" na agenda · telefone do professor no cadastro · relatório separando "receita de aulas" vs "reservas".

**Técnicas (decidi eu — exposto pra veto):**
- **Aula = `booking` vinculado a um professor** (coluna nova `teacher_id`; null = reserva normal). Reusa agenda, recorrência (`generateRecurringDates` já existe), disponibilidade e a trava de double-booking. *Risco se errado: aula e reserva compartilham código — um bug numa afeta a outra. Mitigo isolando os campos de professor e testando os dois fluxos.*
- **Professor = tabela nova `teachers`** (nome, telefone, valor/hora arena, valor/hora professor opcional, notes). Separado de `clients` porque professor tem valor/hora e mistura poluiria a lista de clientes. *Risco: baixo.*
- **Ganho do professor = coluna nova `teacher_earning` no booking** (opcional). Fica FORA do `value` (que é o ganho da arena e já soma no faturamento). *Risco: baixo — campo aditivo.*
- **A reserva-aula preenche `client_name`/`client_phone`** (que são obrigatórios no banco) com os dados do professor. O "cliente" de uma aula é o próprio professor.
- **Valor congelado por aula:** editar o valor/hora no cadastro do professor NÃO muda aulas já lançadas (histórico), igual reservas congelam o preço.

## Fora de escopo (cortado do MVP)

- Login/app do professor (fase 2).
- Cadastro de alunos por aula / lista de presença.
- "Cancelar a série inteira" de uma recorrência num clique.
- Comissão automática / split arena×professor calculado (a dona digita os 2 valores; o sistema não calcula divisão).

## Furos conhecidos / suposições

- **Cancelar aula recorrente é uma a uma** — não há "cancelar série". Mesmo comportamento das reservas recorrentes atuais. Aceito no MVP.
- **Ganho do professor opcional** — se a dona não preencher, o "quanto ele faturou" fica zerado; só o ganho da arena aparece. UI deixa claro.
- **[suposição]** valor/hora fica como default no cadastro do professor e a aula herda (editável por aula). A confirmar na implementação.

## Arquitetura de dados (resumo pro plan)

- **Nova tabela `teachers`:** id, owner_id, name, phone, valor_hora_arena, valor_hora_professor (nullable), notes, created_at, updated_at.
- **`bookings` +2 colunas:** `teacher_id uuid` (nullable), `teacher_earning numeric` (nullable/default 0).
- **Faturamento:** `value` da aula já entra no `bookingRevenue` (relatório). O extra "separar receita de aulas" filtra por `teacher_id is not null`. Resumo por professor agrupa bookings por `teacher_id`.

## Pendente de Augustus

- [revisar] Confirmar o design acima (principalmente os 2 valores + "aula é reserva").
- Handoff: `plan-gangary` gera o brief técnico → dispara no claude-deep DEPOIS dos 3 ajustes irem pro ar.
