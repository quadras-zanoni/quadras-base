# Aviso de reserva no WhatsApp do dono

> Brainstorm fechado e implementado em 2026-06-13. Branch `preview/arena-do-parque`.

## O que vamos fazer

Quando um cliente reserva pela página pública, ele vê um botão **"Avisar a arena no WhatsApp"**
que abre o WhatsApp dele já com a mensagem escrita, endereçada ao número da arena. Ele só dá enviar.
O dono recebe o aviso no WhatsApp e confirma a reserva no painel (como já era).

## Pra quem / por quê

Dono da quadra (Zanone, e o cliente Arena do Parque / Dra). Hoje a reserva cai na agenda como
pendente, mas o dono só descobre se abrir o painel. O aviso no WhatsApp dá o empurrão pra ele
saber na hora — sem trocar nada no fluxo de confirmação que já existe.

## Decisões fechadas

- **Modelo de envio: `wa.me` (click-to-chat).** O próprio cliente dispara a mensagem do WhatsApp
  dele. Descartado disparo automático (Evolution/n8n) e WhatsApp oficial da Meta (Cloud API):
  ambos exigem infra/burocracia/custo que não se justificam aqui. _Decisão do Augustus 2026-06-13._
- **Confirmação continua no painel.** O WhatsApp só notifica — não há resposta "confirmo" voltando
  pro sistema (seria muito mais trabalho e frágil, com ganho pequeno). _Decisão do Augustus._
- **Número por arena**, não por quadra. O dono é um só; um número de aviso por arena. Refinável
  pra por-quadra depois sem retrabalho. _Decisão do Augustus._
- **Onde o dono cadastra:** tela **Link do Cliente** (já é a tela de "divulgue sua arena").
  Não criei tela de configurações nova. _[decidi eu — risco se errado: nenhum, é só onde mora o campo]_
- **Onde guardo o número:** tabela nova `arena_settings` (owner_id PK, notify_whatsapp), com RLS
  owner-only + RPC pública `get_public_arena` (SECURITY DEFINER, só o número) — mesmo padrão de
  segurança da migration 0003. _[decidi eu — risco se errado: nenhum estrutural]_

## Fora de escopo

- Disparo automático do sistema (sem clique do cliente).
- Responder "confirmo/não" pelo WhatsApp e o sistema entender.
- Nome dinâmico da arena na página pública (segue "Arena do Parque" hard-coded — não foi pedido).

## Furos conhecidos / o que o dono precisa saber

1. **O número da arena fica visível** pra quem reserva (vai dentro do link wa.me). É o número
   comercial que ele quer divulgar mesmo — só não deve usar um número pessoal privado. _(Avisado
   no texto de ajuda da tela Link do Cliente.)_
2. **Depende do cliente clicar** no botão. Mas a reserva já cai na agenda como pendente de qualquer
   jeito — o WhatsApp é reforço, nada se perde se ele não clicar. _(Também avisado na tela.)_

## "Extra" que se mostrou desnecessário

O botão wa.me no painel (dono → cliente) que o Augustus aceitou **já existia** na tela de Agenda
(lista e grade, + abre ao confirmar, + "cancelar e avisar"). Não precisou implementar.

## Pendente de Augustus

- `[ação]` Rodar `supabase/migrations/0004_arena_settings.sql` no SQL Editor do banco compartilhado
  (`cagkwoqyannbmputqxlz`). Sem isso a tabela não existe e o campo/botão não funcionam.
- `[revisar]` Testar o fluxo: cadastrar o número em Link do Cliente → reservar pela página pública
  → conferir o botão e a mensagem pré-preenchida.
