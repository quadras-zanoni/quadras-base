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
- `/dashboard` sem sessão → redireciona para `/login` (guard funcionando).
- `/r/<token_link_publico>` → 200, formulário de reserva pública renderiza.
- Variáveis de ambiente de produção configuradas no Vercel: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_DEV_TENANT_SLUG=base`,
  `NEXT_PUBLIC_APP_URL=https://quadras-base.vercel.app`.

## Observações desta primeira implantação
- O título/idioma da página ainda estavam no padrão do `create-next-app`
  ("Create Next App" / `lang="en"`) até a implantação inicial — corrigido para
  "BASE" / `lang="pt-BR"` antes de declarar o deploy concluído.
- Login interativo completo (criar quadra, criar agendamento, confirmar reserva
  pública) não foi testado em navegador real nesta sessão — apenas via curl
  (códigos de status e conteúdo das páginas). Recomenda-se um teste manual
  completo na primeira oportunidade.
