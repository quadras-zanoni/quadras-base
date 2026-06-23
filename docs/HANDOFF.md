# HANDOFF — quadras-base v1

**Produção:** https://quadras-base.vercel.app
**GitHub:** github.com/quadras-zanoni/quadras-base
**Vercel project:** quadras-base (team quadras-zanoni-s-projects)
**Supabase project ref:** falfcgaqaojpgwzqwequ (org quadras-zanoni, region sa-east-1)

## Tenant demo/base
- slug: `base`
- login: admin@quadrashub.app (senha definida na criação do tenant, trocar antes de qualquer demo pública)
- link público: https://quadras-base.vercel.app/r/cdc3bc45-f00d-4dd4-89c9-a98b61ea3430

## Como adicionar um cliente real
Ver `docs/ONBOARDING-NOVO-CLIENTE.md`.

## O que ainda não existe
- Quadras Hub (prospecção + cobrança Mercado Pago centralizada) — o gate de
  assinatura aqui é mocado lendo `tenants.status_assinatura` direto
  (`src/lib/subscription.ts`). Ver design doc §7 para o contrato que o Hub
  precisa expor.
- Domínio próprio por cliente (suportado pela arquitetura, não configurado ainda).
- Múltiplos usuários por tenant.

## Verificação de produção (smoke test)
- `/login` → 200, título "BASE".
- `POST /api/login` com as credenciais do tenant `base` → 303 para `/dashboard`, sessão funcionando.
- `/dashboard` autenticado → 200, painel renderiza ("Boa tarde, Administrador!").
- `/dashboard` sem sessão → redireciona para `/login` (guard funcionando).
- `/r/<token_link_publico>` → 200, formulário de reserva pública renderiza.
- Variáveis de ambiente de produção configuradas no Vercel: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_DEV_TENANT_SLUG=base`,
  `NEXT_PUBLIC_APP_URL=https://quadras-base.vercel.app`.

## Bugs encontrados e corrigidos após o deploy inicial
- Título/idioma da página ainda no padrão do `create-next-app` ("Create Next
  App" / `lang="en"`) — corrigido para "BASE" / `lang="pt-BR"`.
- Raiz (`/`) mostrava só o texto placeholder "BASE" sem redirecionar — agora
  redireciona para `/login`.
- **Login não funcionava de jeito nenhum em produção.** Duas causas reais, achadas testando o fluxo de ponta a ponta:
  1. O formulário usava uma Server Action (`action={login}`), que o Next.js
     invoca via fetch com cabeçalho `Next-Action` quando o JS está ativo (ou
     seja, sempre, em uso normal). Essa invocação específica falhava com um
     erro "Connection closed" não tratável pelo próprio código da action,
     antes mesmo dela rodar. O fallback de formulário puro (sem JS) funcionava
     normalmente. Resolvido trocando para um Route Handler (`/api/login`)
     chamado por um `<form method="POST">` simples, evitando esse caminho.
  2. **Causa raiz de fato:** `resolverTenantSlug` (`src/lib/tenant.ts`) só
     tratava `localhost`/`127.0.0.1` como caso especial; para qualquer outro
     host (inclusive `quadras-base.vercel.app`, já que nenhum domínio próprio
     `*.quadrashub.app` foi configurado ainda) extraía o primeiro rótulo do
     hostname como slug do tenant — ou seja, lia "quadras-base" em vez de
     "base". O tenant nunca era encontrado e o layout do admin redirecionava
     pra `/login` mesmo com a sessão válida. Corrigido para só tratar como
     subdomínio de tenant hosts que terminem em `.quadrashub.app`; qualquer
     outro host cai no tenant de desenvolvimento.
  3. **Atenção para quando um domínio próprio for configurado**: revisar
     `resolverTenantSlug` se o padrão de domínio mudar (hoje é estritamente
     `<slug>.quadrashub.app`).
