# Como adicionar um novo cliente (tenant)

Não existe fork de repositório. Todo cliente novo é uma linha na tabela
`tenants` do mesmo banco, com seu próprio login admin.

1. Rodar:
   ```bash
   npx tsx scripts/criar-tenant.ts --slug=nome-da-arena --nome="Nome da Arena" --email=dono@arena.com --senha="senha-temporaria"
   ```
2. Guardar o `token_link_publico` impresso — é a base do link público de
   agendamento daquele cliente (`/r/<token>`).
3. Apontar o subdomínio `<slug>.quadrashub.app` para o projeto Vercel
   (wildcard DNS já cobre isso automaticamente; confirmar no painel
   Vercel → Domains se for o primeiro cliente).
4. Personalizar marca: `update tenants set logo_url = '...', cor_primaria = '#...' where slug = 'nome-da-arena';`
5. Cadastrar as quadras do cliente (tela Quadras) e o número de WhatsApp
   de avisos (tela Link do Cliente).
6. Pedir para o cliente trocar a senha no primeiro acesso.
