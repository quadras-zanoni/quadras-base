# Design — Modalidades, preço por faixa e link curto (Arena do Parque)

> Fechado em 2026-07-02 via bs-gangary. Aprovado pelo Augustus ("pode meter bala").
> Executor: Claude (fundação) + 4 subagentes Sonnet (telas).

## O que vamos fazer (em valor)
Deixar o cadastro de quadra e a reserva pública mais completos antes de fechar venda com o Zanoni/arenas: (1) preço que varia por horário e dia da semana, (2) quadra com várias modalidades e o cliente escolhendo o que vai jogar, (3) link público curto e bonito.

## Pra quem / por quê
Donos de arena cobram preços diferentes (tarde x noite, semana x fim de semana) e têm quadras multiuso (vôlei/beach tennis/futevôlei na mesma). O link atual (`/reservar/UUID-gigante`) é feio de compartilhar na bio.

## Decisões fechadas

### 1. Preço por faixa (horário + dia da semana)
- `pricePerHour` vira **preço base/padrão** (fallback). Faixas opcionais em `price_tiers` (jsonb). `[decidi eu — risco baixo]`
- Cada faixa = `{ days:[0..6], start:"HH:MM", end:"HH:MM", price }`. days = getDay() (0=Dom). `[decidi eu]`
- Valor do slot = 1ª faixa que casa (dia + horário de início) senão base, × duração/60. Slot que cruza 2 faixas cobra pela faixa do **início**. Sobreposição → 1ª que casar (dono ordena). `[decidi eu]`
- Augustus escolheu incluir **dia da semana** já agora (cobre fim de semana mais caro).

### 2. Modalidades
- `Court.type` (1 só) → `Court.modalities: Modality[]`. Enum fixo: **vôlei, beach tennis, futevôlei**. `[decidi eu]`
- Migration: tipo antigo → array; futsal/society/tênis/outro viram `beach_tennis` por padrão (dono reajusta). `[decidi eu — risco: piloto quase vazio]`
- Link público: cliente escolhe modalidade (se quadra tem >1); salva em `booking.modality` pro dono ver. `[decidi eu — barato, serve o "deixar tudo certo"]`

### 3. Link curto
- `arena_settings.slug` (único), auto/editável na tela Link do Cliente. Link = `/reservar/{slug}`. `[decidi eu]`
- Rota aceita **slug OU o UUID** → links antigos não quebram. RPC `resolve_arena_slug`. `[decidi eu]`

## Fora de escopo (cortado de propósito)
- Domínio próprio (`arena.link/xyz`) — precisa comprar domínio.
- Preço por feriado/data específica — só dia da semana por ora.
- Preço diferente por modalidade — **suposição confirmada pelo Augustus: preço é da quadra+horário, não do esporte.**

## Furos conhecidos / suposições
- Preço vem do client no submit (via value por slot) — mesmo risco que já existia com p_value; aceitável pra piloto. `[risco baixo]`
- Slug duplicado entre arenas → índice único no banco + toast de erro na UI.
- Migration 0005 precisa ser aplicada no banco que o Vercel usa (passo manual no SQL Editor).

## Arquivos
- **Fundação (Claude):** `0005_modalities_price_tiers_slug.sql`, `types/index.ts`, `lib/pricing.ts` (novo), `hooks/useCourts.ts`.
- **Telas (subagentes Sonnet):** `quadras/page.tsx`, `reservar/[ownerId]/page.tsx`, `agendamentos/novo/page.tsx`, `link-cliente/page.tsx` + `hooks/useArenaSettings.ts`.
