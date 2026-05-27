# Processo: Fork do CRM para Novo Cliente

## Visão Geral
O `quadras-base` é o projeto-base. Para cada novo cliente, fazemos um fork com identidade visual própria, Supabase próprio e Vercel próprio.

---

## Checklist Completo

### 1. GitHub — Criar Repositório
- [ ] Logar no GitHub como `quadras-zanoni` (não `zanoni-gui`)
- [ ] Criar repo **privado** com nome `crm-[nome-cliente]` em **github.com/quadras-zanoni**
- [ ] Exemplo: `quadras-zanoni/crm-seven-beach`

> ⚠️ ERRO COMUM: criar o repo na conta pessoal `zanoni-gui` ao invés da org `quadras-zanoni`. O Vercel só enxerga repos da org `quadras-zanoni`.

---

### 2. Local — Copiar o Projeto Base
```powershell
# Copiar arquivos (nunca copiar node_modules, .next, .git, .vercel)
$src = "C:\Users\Fartech Gamer\Desktop\quadras-base"
$dst = "C:\Users\Fartech Gamer\Desktop\crm-[cliente]"

Copy-Item -Path "$src\src" -Destination "$dst\src" -Recurse -Force
Copy-Item -Path "$src\public" -Destination "$dst\public" -Recurse -Force
Copy-Item "$src\next.config.ts", "$src\tsconfig.json", "$src\postcss.config.mjs" -Destination "$dst\" -Force
Copy-Item "$src\eslint.config.mjs", "$src\.gitignore", "$src\package.json" -Destination "$dst\" -Force
Copy-Item -Path "$src\supabase" -Destination "$dst\supabase" -Recurse -Force
```

---

### 3. Local — Identidade Visual
Arquivos a editar para rebrandar:
- `src/app/globals.css` — trocar cores CSS variables
- `src/app/layout.tsx` — trocar fontes e metadata title
- `src/components/layout/Sidebar.tsx` — trocar nome e cores
- `src/app/login/page.tsx` — trocar nome, cores, texto
- `src/app/cadastro/page.tsx` — trocar nome, cores, texto
- `src/app/reservar/[ownerId]/page.tsx` — trocar nome, cores
- `src/app/(panel)/link-cliente/page.tsx` — verificar `user?.id` (não `user?.uid`)
- `package.json` — trocar `"name"` para `crm-[cliente]`

**Mapeamento de cores (base → novo):**
| Variável | Quadras Base | Seven Beach |
|---|---|---|
| primária | `#6b2cff` (roxo) | `#2A9D8F` (teal) |
| secundária | `#ff00d4` (magenta) | `#E76F51` (laranja) |
| acento | `#00d9ff` (cyan) | `#52B788` (verde) |
| bg-base | `#05050a` | `#071210` |
| bg-panel | `#0d0d16` | `#0d1c1a` |

---

### 4. Local — Supabase Client
Editar `src/lib/supabase.ts` — colocar as credenciais reais como fallback:
```typescript
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://SEU-PROJECT-ID.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_SUA_CHAVE'
)
```
> ⚠️ CRÍTICO: sem isso, o site deploya com URL "placeholder" e não conecta ao banco.

---

### 5. Local — Criar .vercelignore
Criar arquivo `.vercelignore` na raiz:
```
node_modules
.next
.env*.local
*.tsbuildinfo
next-env.d.ts
```

---

### 6. Local — Git Init com Identidade CORRETA
```powershell
cd C:\Users\Fartech Gamer\Desktop\crm-[cliente]

# OBRIGATÓRIO: usar a conta quadras-zanoni, NÃO zanoni-gui
# O repositório pertence à org quadras-zanoni no GitHub
# O projeto Vercel pertence à conta quadras-zanoni
# TUDO deve ser da quadras-zanoni para não misturar contas
git init
git config user.name "quadras-zanoni"
git config user.email "quadras-zanoni@users.noreply.github.com"

git add .
git commit -m "feat: fork [Nome Cliente] a partir do quadras-base"

# Conectar ao repo criado na org quadras-zanoni
git remote add origin https://github.com/quadras-zanoni/crm-[cliente].git

# Para push funcionar, autenticar o gh como quadras-zanoni:
# gh auth setup-git (após gh auth login com quadras-zanoni)
git push -u origin master
```

> ⚠️ ERRO CRÍTICO: usar `zanoni-gui` como autor do commit quando o repo e o Vercel são da `quadras-zanoni`. O Vercel bloqueia com "commit author did not have contributing access". SEMPRE usar `quadras-zanoni` como autor em repos da org `quadras-zanoni`.

---

### 7. Supabase — Criar Novo Projeto
```bash
# Via CLI (já logado com npx supabase login)
npx supabase projects create "nome-cliente" \
  --org-id slctkkpoqtirqngekgcc \
  --region sa-east-1 \
  --db-password "SenhaForte2026!"
```
Anotar o **Reference ID** retornado (ex: `wraxcyngnngvrqhbrsvo`)

---

### 8. Supabase — Pegar Credenciais
```bash
npx supabase projects api-keys --project-ref SEU-REF-ID
```
Pegar a chave `default` no formato `sb_publishable_...`

A URL será: `https://SEU-REF-ID.supabase.co`

---

### 9. Supabase — Rodar Schema SQL
```bash
cd C:\Users\Fartech Gamer\Desktop\crm-[cliente]
npx supabase link --project-ref SEU-REF-ID
echo "Y" | npx supabase config push --project-ref SEU-REF-ID
npx supabase db query --linked -f supabase/migrations/0001_init.sql
```

---

### 10. Supabase — Desativar Confirmação de Email
Criar `supabase/config.toml`:
```toml
[auth.email]
enable_confirmations = false
```
Rodar:
```bash
echo "Y" | npx supabase config push --project-ref SEU-REF-ID
```
**Deletar o config.toml depois** (não commitar, não fazer parte do projeto).

---

### 11. Vercel — Logar na conta correta
```bash
vercel login
# Logar como quadras-zanoni (não zanoni-gui)
```

---

### 12. Vercel — Linkar Projeto
```powershell
cd C:\Users\Fartech Gamer\Desktop\crm-[cliente]
vercel link --yes --scope quadras-zanoni-s-projects --project crm-[cliente]
```

---

### 13. Vercel — Adicionar Variáveis de Ambiente
```powershell
$url = "https://SEU-REF-ID.supabase.co"
$key = "sb_publishable_SUA_CHAVE"

echo $url | vercel env add NEXT_PUBLIC_SUPABASE_URL production --yes
echo $url | vercel env add NEXT_PUBLIC_SUPABASE_URL development --yes
echo $key | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --yes
echo $key | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development --yes
```

---

### 14. Vercel — Deploy
```powershell
vercel --prod --yes
```

### 15. Vercel — Conectar GitHub (Settings → Git)
No dashboard Vercel: **Settings → Git → Connect** → selecionar `quadras-zanoni/crm-[cliente]`
Isso garante auto-deploy a cada push.

---

## Para o crm-seven-beach (situação atual)

O repo ainda precisa ser criado em `quadras-zanoni/crm-seven-beach` no GitHub.
Passos pendentes:
1. Criar repo `crm-seven-beach` na org `quadras-zanoni` no GitHub
2. Adicionar `zanoni-gui` como colaborador do repo (ou fazer push com `quadras-zanoni` auth)
3. Rodar: `git remote set-url origin https://github.com/quadras-zanoni/crm-seven-beach.git && git push -u origin master`
4. No Vercel: Settings → Git → Connect → selecionar `quadras-zanoni/crm-seven-beach`
5. Isso vai triggar o deploy automático com as credenciais corretas

---

## Erros Encontrados e Soluções

| Erro | Causa | Solução |
|---|---|---|
| "Deployment Blocked: commit email" | Email do git não bate com GitHub | Usar `234858207+zanoni-gui@users.noreply.github.com` |
| Site com credenciais "placeholder" | Deploy cacheou versão antiga | Hardcodar URL/chave em `src/lib/supabase.ts` como fallback |
| "supabaseUrl is required" no build | `.env.local` com valor vazio | Usar `\|\|` (não `??`) no fallback do supabase.ts |
| `vercel build` falha localmente | Incompatibilidade Next.js 16 + Turbopack | Não usar `vercel build` local — usar `vercel --prod` direto |
| CLI fica preso em "Building..." | Vercel CLI perde WebSocket no Windows | Normal — o build continua no servidor; verificar no dashboard |
| "Permission denied" no push | Repo na org errada | Criar repo na `quadras-zanoni` org, não em `zanoni-gui` |
