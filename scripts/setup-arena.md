# Checklist — Onboarding de nova arena

Siga essa ordem. Cada passo depende do anterior.

---

## 1. Repositório

- [ ] Fazer fork/cópia do repositório `quadras-base`
- [ ] Renomear para `crm-nome-da-arena`
- [ ] Criar novo projeto no Supabase (projeto separado por arena)
- [ ] Executar o SQL do schema no SQL Editor do Supabase
- [ ] Configurar `.env.local` com as credenciais Supabase da arena

## 2. Billing hub

- [ ] Acessar `https://billing-hub-six.vercel.app/admin` (senha no Vercel env `ADMIN_PASSWORD`)
- [ ] Aba **Clientes Ativos** → **Novo cliente** → preencher dados da arena
- [ ] Copiar o `tenant_key` gerado (ex: `arena-do-parque`)
- [ ] Definir o status como **Trial** por enquanto (ativa depois do pagamento de ativação)

## 3. Vercel

- [ ] Criar novo projeto na Vercel linkado ao repositório
- [ ] Adicionar env vars:
  ```
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  BILLING_HUB_URL=https://billing-hub-six.vercel.app
  BILLING_TENANT_KEY=tenant_key_copiado_acima
  ```
- [ ] Fazer o deploy

## 4. Ativação

- [ ] Cobrar R$ 200 de ativação por fora (Pix, dinheiro, transferência)
- [ ] Após receber o pagamento, voltar no billing-hub → cliente → editar:
  - Status: **Ativo**
  - Data próximo vencimento: hoje + 30 dias
- [ ] O sistema começa a cobrar R$ 100/mês automaticamente a partir daí

---

## Como funciona depois

- A cada acesso ao CRM da arena, o middleware consulta o billing-hub
- Se a assinatura estiver ativa: acesso normal
- Se vencida: redireciona para a tela de pagamento com QR Code PIX de R$ 100
- Quando o PIX é confirmado pelo Mercado Pago via webhook → acesso liberado automaticamente em até 15 segundos
