import { redirect } from 'next/navigation'

// Cadastro público desativado (2026-07-03): contas de dono de arena são
// provisionadas pelo admin (painel Supabase ou tela "criar arena" no billing-hub).
// Rota mantida viva pra não quebrar links antigos — redireciona pro login.
export default function CadastroPage() {
  redirect('/login')
}
