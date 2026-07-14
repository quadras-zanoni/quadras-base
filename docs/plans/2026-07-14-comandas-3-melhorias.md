# Quality Brief — 3 melhorias em Comandas/Vendas (app das arenas)

> Repo: `SAAS Beach Tennis` (Next.js 16 / React 19 / Tailwind v4 / Supabase).
> Feedback de uso real da dona da Arena do Parque (Suany). Produção — não quebrar.
> Executor: claude-deep (GLM/DeepSeek coda). Opus revisa e comita.

**Objetivo:** entregar 3 ajustes pedidos pela dona, sem regressão no fluxo de comanda/venda/estoque/relatório.

**Gate obrigatório (pare só com os dois verdes):** `npx tsc --noEmit` (exit 0) e `npm run build` (exit 0). NÃO comite, NÃO faça push, NÃO faça deploy. NÃO aplique migration no banco. Pare no diff pronto + resumo.

**Regras rígidas (não violar):**
- NÃO adicione biblioteca nova. Use os componentes já existentes (`Input`, `Select`, `Button`, `Modal`, ícones `lucide-react`).
- NÃO mexa em RLS nem nos grants.
- NÃO altere as funções SQL `register_sale`, `comanda_add_item`, `comanda_remove_item` (são transacionais de estoque). O desconto NÃO passa por elas — ver FEATURE 3.
- Mantenha o padrão visual/idioma (pt-BR) das telas atuais.

---

## FEATURE 1 — Busca de produto pra lançar (comanda + venda)

**Dor:** a grade de produtos é uma lista de botões; com muitos produtos vira rolagem. A dona quer buscar por nome.

**Onde:**
- `src/app/(panel)/comandas/ComandaDetail.tsx` — bloco "Produtos" (a grade `activeProducts.map`, ~linha 182-221).
- `src/app/(panel)/vendas/page.tsx` — bloco "Produtos" (a grade `activeProducts.map`, ~linha 193-233).

**Contrato:**
- Adicionar um campo de busca (`<Input>`) logo acima da grade, em AMBAS as telas.
- Estado local `const [produtoBusca, setProdutoBusca] = useState('')`.
- Filtrar: `activeProducts.filter(p => p.name.toLowerCase().includes(produtoBusca.trim().toLowerCase()))`. Busca vazia = mostra todos (comportamento atual).
- Placeholder tipo "Buscar produto…". Só filtra a exibição — não muda nada de lançamento/estoque.
- Se o filtro zerar resultados, mostrar uma linha discreta "Nenhum produto encontrado" (reuse o mesmo estilo do "Nenhum produto cadastrado").

**FORBIDDEN:** não mudar como o produto é lançado (`handleAdd`/`addProduct`), não tocar em estoque, não reordenar a grade.

---

## FEATURE 2 — Horário com quantidade (comanda)

**Dor:** hoje o campo de horário aceita 1 valor e SUBSTITUI a linha. Pra 2 horários a dona soma na mão e não consegue registrar quantos foram.

**Onde:**
- `src/hooks/useComandas.ts` — função `setHorario` (~linha 100).
- `src/app/(panel)/comandas/ComandaDetail.tsx` — bloco "Horário" (~linha 164-179) + prefill (~linha 57-63) + `handleHorario` (~linha 81-87).

**Contrato:**
- `setHorario` passa a aceitar quantidade: `setHorario(comandaId: string, valorUnit: number, quantity: number, label = 'Horário')`.
  - A linha do horário vira: `{ productId: HORARIO_ID, productName: label, quantity, unitPrice: valorUnit, total: valorUnit * quantity }`.
  - Mantém o comportamento de SUBSTITUIR a linha `HORARIO_ID` existente (não acumular), como hoje. O total da comanda continua sendo `calcTotal(items)` (já soma `item.total`), então fica correto.
- UI: ao lado do campo "Valor do horário (R$)", adicionar um campo "Quantidade" (`type="number"`, default `1`, mínimo `1`). O botão "Lançar" chama `setHorario(id, valor, qtd)`.
  - Mostrar uma prévia do total quando qtd > 1 (ex: texto "2 × R$ 50,00 = R$ 100,00") — opcional, mas ajuda.
- `handleHorario`: validar valor > 0 e quantidade >= 1 (int). Se quantidade vazia/inválida, tratar como 1.
- Prefill (o `useEffect` que lê a linha de horário existente): passar a preencher OS DOIS campos — `unitPrice` no valor e `quantity` na quantidade.
- A lista de itens (~linha 232) e o comprovante (~linha 121) já renderizam `{quantity}x {productName}` — vão mostrar "2x Horário" automaticamente. Confirmar que continua certo.

**FORBIDDEN:** não fazer o horário baixar/mexer estoque (ele nunca mexeu — `productId === HORARIO_ID` é ignorado em estoque). Não mudar a assinatura de outras funções do hook.

---

## FEATURE 3 — Desconto no total (comanda + venda) — A MAIS DELICADA

**Dor:** a soma dos itens deu R$10,50, a dona cobrou R$10 (deu R$0,50 de desconto). Ela quer registrar isso pro sistema saber **o que realmente entrou**.

### Modelo de dados (JÁ DECIDIDO — não reinventar)

- A migration `supabase/migrations/0008_desconto.sql` **já foi escrita** e adiciona `sales.desconto numeric not null default 0`. Você NÃO aplica no banco; assuma que a coluna existe.
- O `total` da venda **CONTINUA sendo o BRUTO** (soma dos itens). NÃO muda.
- O valor que entrou de fato = **`total - desconto`**, e é calculado na LEITURA. Isso é o que blinda o desconto de ser apagado pelas RPCs de recálculo de total.

### Type

- `src/types/index.ts` — interface `Sale`: adicionar `desconto?: number` (opcional, retrocompatível).

### Gravação

**Comanda** (`src/hooks/useComandas.ts`):
- Nova função `setDescontoComanda(comandaId: string, value: number)` que faz `update sales set desconto = value, updated_at = now() where id = comandaId` (via `supabase.from('sales').update(...)`, mesmo caminho anon/owner do `setHorario`). Trate erro real (throw). Recarrega (`load()`).
- Adicionar `desconto` no `mapComanda` (`desconto: (row.desconto as number) ?? 0`).
- `closeComanda` NÃO muda (o desconto já está gravado na linha; o total bruto também).
- As RPCs `comanda_add_item`/`comanda_remove_item` só tocam `items` e `total` (bruto) → o desconto sobrevive a lançar/remover produto. NÃO as altere.

**Venda avulsa** (`src/hooks/useSales.ts` → `registerSale`):
- A RPC `register_sale` grava a venda atômica (com o total bruto) e RETORNA o `id`. Hoje o hook ignora o retorno.
- Passar a capturar o id: `const { data, error } = await supabase.rpc('register_sale', {...})`. Se `error` throw.
- Depois, SE `desconto > 0`, fazer `await supabase.from('sales').update({ desconto }).eq('id', data)`. (Update pós-insert — decisão consciente pra NÃO tocar a RPC transacional de estoque. Se este update falhar, a venda já está salva; trate o erro sem reverter a venda, apenas propague/toast.)
- Assinatura: `registerSale(items, paymentMethod, notes?, clientId?, clientName?, desconto = 0)`.

### Leitura — usar o LÍQUIDO (`total - desconto`) nestes 6 pontos

1. `src/hooks/useSales.ts` — `mapSale`: adicionar `desconto: (row.desconto as number) ?? 0`. `todayRevenue`: `sum(s.total - (s.desconto ?? 0))`.
2. `src/app/(panel)/relatorio/page.tsx:~85` — o map interno: incluir `desconto: row.desconto ?? 0`.
3. `relatorio/page.tsx:~109` — `salesRevenue = sales.reduce((s, v) => s + (v.total - (v.desconto ?? 0)), 0)`.
4. `relatorio/page.tsx:~121` — `lucroProdutos = salesRevenue - custoProdutos` (fica correto automaticamente: a receita já é líquida, o custo do estoque não muda, a margem cai com o desconto — comportamento certo).
5. `relatorio/page.tsx:~136` — `byPayment[pm] += (s.total - (s.desconto ?? 0))`.
6. `relatorio/page.tsx:~147` — `dailyRevenue[key] += (s.total - (s.desconto ?? 0))`.

> Regra: em TODO lugar que soma faturamento/receita de `sales`, use `total - desconto`. O `custoProdutos` (linha ~113-119) NÃO muda.

### UI

**Comanda** (`ComandaDetail.tsx`):
- Um campo "Desconto (R$)" perto do Total. Ao sair do campo / botão, chama `setDescontoComanda(id, valor)`. Prefill com o `desconto` atual da comanda.
- No bloco Total: quando `desconto > 0`, mostrar as 3 linhas: **Subtotal** (`c.total`), **Desconto** (`- fmt(desconto)`), **Total a pagar** (`c.total - desconto`). Quando desconto = 0, mostrar só o Total como hoje.
- O botão "Fechar" mostra o líquido: `Fechar {fmt(c.total - desconto)}`.

**Venda avulsa** (`vendas/page.tsx`):
- Estado `const [desconto, setDesconto] = useState(0)` (resetar em `openModal`).
- Campo "Desconto (R$)" no formulário (perto do total/carrinho).
- O bloco de total mostra Subtotal / Desconto / Total quando desconto > 0.
- `handleSave` passa o desconto pro `registerSale(...)`. O botão "Registrar" mostra o líquido.
- Na LISTA de vendas (~linha 144-188), o `fmt(sale.total)` exibido deve mostrar o líquido (`sale.total - (sale.desconto ?? 0)`); se `desconto > 0`, opcional exibir uma linha "desconto R$X" no detalhe da venda.

**FORBIDDEN no #3:**
- NÃO alterar `register_sale`, `comanda_add_item`, `comanda_remove_item` (SQL). O desconto é coluna + update, nunca dentro dessas funções.
- NÃO fazer o `total` gravado virar líquido. Total = bruto, sempre.
- NÃO deixar o desconto ser negativo nem maior que o total (clamp: `0 <= desconto <= total`).

---

## Pronto quando

- `tsc` verde + `build` verde.
- Busca funciona nas 2 telas (comanda + venda).
- Horário aceita quantidade e a linha vira "Nx Horário".
- Desconto: coluna lida como líquido nos 6 pontos; total bruto intacto; RPCs de estoque não tocadas; UI mostra subtotal/desconto/total nas 2 telas.
- Resumo final: arquivos alterados + 1 linha cada + confirmação tsc/build verdes.
