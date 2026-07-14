'use client'

import { useEffect, useState } from 'react'
import { Sale, SaleItem, Product, Client, PAYMENT_METHODS } from '@/types'
import { HORARIO_ID } from '@/hooks/useComandas'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Plus, Trash2, Clock, MessageCircle, Wallet, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function openWhatsApp(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, '')
  const url = cleaned
    ? `https://wa.me/${cleaned.startsWith('55') ? cleaned : `55${cleaned}`}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

interface Props {
  comanda: Sale | null
  products: Product[]
  clients: Client[]
  onExit: () => void
  addItem: (comandaId: string, productId: string, qty?: number) => Promise<void>
  removeItem: (comandaId: string, productId: string) => Promise<void>
  setHorario: (comandaId: string, valorUnit: number, quantity: number, label?: string) => Promise<void>
  setDescontoComanda: (comandaId: string, value: number) => Promise<void>
  closeComanda: (comandaId: string, paymentMethod: Sale['paymentMethod'], bookingId?: string) => Promise<void>
  cancelComanda: (comandaId: string, items: SaleItem[]) => Promise<void>
}

export function ComandaDetail({
  comanda, products, clients, onExit,
  addItem, removeItem, setHorario, setDescontoComanda, closeComanda, cancelComanda,
}: Props) {
  // snapshot: mantém os dados da comanda mesmo depois de ela sair da lista de abertas
  // (ao fechar/cancelar), para renderizar a tela de sucesso / comprovante.
  const [snap, setSnap] = useState<Sale | null>(comanda)
  useEffect(() => { if (comanda) setSnap(comanda) }, [comanda])

  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [payment, setPayment] = useState<Sale['paymentMethod']>('pix')
  const [horarioInput, setHorarioInput] = useState('')
  const [horarioQtd, setHorarioQtd] = useState('1')
  const [phone, setPhone] = useState('')
  const [produtoBusca, setProdutoBusca] = useState('')
  const [descontoInput, setDescontoInput] = useState('')

  // Enquanto edita usa a comanda ao vivo; após fechar (comanda sai da lista de
  // abertas) cai no snapshot para manter a tela de sucesso/comprovante.
  const c = comanda ?? snap

  // Prefill do valor do horário, quantidade, telefone e desconto.
  useEffect(() => {
    if (!comanda) return
    const h = comanda.items.find(i => i.productId === HORARIO_ID)
    setHorarioInput(h ? String(h.unitPrice) : '')
    setHorarioQtd(h ? String(h.quantity) : '1')
    setDescontoInput(comanda.desconto ? String(comanda.desconto) : '')
    const client = comanda.clientId ? clients.find(cl => cl.id === comanda.clientId) : undefined
    if (client) setPhone(client.phone)
  }, [comanda, clients])

  if (!c) return null

  const activeProducts = products.filter(p => p.status === 'ativo')

  async function handleAdd(p: Product) {
    if (!comanda || p.quantity === 0) return
    try { await addItem(comanda.id, p.id, 1) }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao lançar produto') }
  }

  async function handleRemove(item: SaleItem) {
    if (!comanda) return
    try { await removeItem(comanda.id, item.productId) }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao remover item') }
  }

  async function handleHorario() {
    if (!comanda) return
    const value = Number(horarioInput)
    const qty = Math.max(1, parseInt(horarioQtd, 10) || 1)
    if (!value || value <= 0) return toast.error('Informe um valor de horário')
    try { await setHorario(comanda.id, value, qty); toast.success('Horário lançado') }
    catch { toast.error('Erro ao lançar horário') }
  }

  async function handleDesconto() {
    if (!comanda) return
    const val = Number(descontoInput)
    const clamped = isNaN(val) ? 0 : Math.max(0, Math.min(val, comanda.total))
    if (clamped !== val) setDescontoInput(String(clamped))
    try { await setDescontoComanda(comanda.id, clamped); toast.success('Desconto aplicado') }
    catch { toast.error('Erro ao aplicar desconto') }
  }

  async function handleClose() {
    if (!comanda) return
    if (comanda.items.length === 0) return toast.error('Comanda vazia')
    setBusy(true)
    try {
      // Garante que o desconto exibido/digitado foi persistido antes de virar
      // venda (o líquido no botão Fechar usa descontoInput; sem isso, fechar
      // sem clicar "Aplicar" gravaria o bruto). Re-clampa contra o total atual.
      const pend = isNaN(Number(descontoInput)) ? 0 : Math.max(0, Math.min(Number(descontoInput), comanda.total))
      if (pend !== (comanda.desconto ?? 0)) {
        await setDescontoComanda(comanda.id, pend)
      }
      await closeComanda(comanda.id, payment, comanda.bookingId)
      toast.success('Comanda fechada!')
      setDone(true)
    } catch {
      toast.error('Erro ao fechar comanda')
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (!comanda) return
    if (!confirm('Cancelar a comanda? O estoque dos produtos será devolvido.')) return
    setBusy(true)
    try {
      await cancelComanda(comanda.id, comanda.items)
      toast.success('Comanda cancelada — estoque devolvido')
      onExit()
    } catch {
      toast.error('Erro ao cancelar comanda')
    } finally {
      setBusy(false)
    }
  }

  function sendComprovante() {
    if (!c) return
    const desc = c.desconto ?? 0
    const totalLiq = c.total - desc
    const linhas = c.items.map(i => `• ${i.quantity}x ${i.productName} — ${fmt(i.total)}`).join('\n')
    let msg =
      `*Comprovante — ${c.clientName || 'Cliente'}*\n\n` +
      `${linhas}\n\n`
    if (desc > 0) msg += `*Subtotal: ${fmt(c.total)}*\n*Desconto: -${fmt(desc)}*\n`
    msg += `*Total: ${fmt(totalLiq)}*\n` +
      `Pagamento: ${PAYMENT_METHODS[payment]}\n\n` +
      `Obrigado! 🏖️`
    openWhatsApp(phone, msg)
  }

  // ── Tela de sucesso / comprovante (após fechar) ──
  if (done) {
    return (
      <Modal open onClose={onExit} title="Comanda fechada">
        <div className="space-y-5">
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={26} className="text-success" />
            </div>
            <p className="text-base font-semibold text-ink">{fmt(c.total - (c.desconto ?? 0))} — {PAYMENT_METHODS[payment]}</p>
            <p className="text-sm text-muted mt-0.5">A comanda virou uma venda do dia.</p>
          </div>
          <Input
            label="Telefone para o comprovante (opcional)"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
          <div className="flex gap-3">
            <Button variant="primary" onClick={sendComprovante} className="flex-1">
              <MessageCircle size={16} /> Enviar comprovante
            </Button>
            <Button variant="secondary" onClick={onExit} className="flex-1">Concluir</Button>
          </div>
        </div>
      </Modal>
    )
  }

  // ── Detalhe da comanda aberta ──
  return (
    <Modal open onClose={onExit} title={c.clientName || 'Comanda avulsa'} size="lg">
      <div className="space-y-5">
        {/* Horário */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Horário</p>
          <div className="flex gap-2 items-end">
            <Input
              type="number"
              label="Valor do horário (R$)"
              value={horarioInput}
              onChange={e => setHorarioInput(e.target.value)}
              placeholder="0,00"
              className="flex-[2]"
            />
            <Input
              type="number"
              label="Quantidade"
              value={horarioQtd}
              onChange={e => setHorarioQtd(e.target.value)}
              min={1}
              className="w-20 shrink-0"
            />
            <Button variant="secondary" onClick={handleHorario} className="shrink-0">
              <Clock size={15} /> Lançar
            </Button>
          </div>
          {(() => {
            const val = Number(horarioInput)
            const qtd = parseInt(horarioQtd, 10) || 1
            if (val > 0 && qtd > 1) {
              return <p className="text-xs text-muted mt-1.5">{qtd} × {fmt(val)} = {fmt(val * qtd)}</p>
            }
            return null
          })()}
        </div>

        {/* Produtos — clique para lançar (baixa estoque na hora) */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Produtos <span className="normal-case font-normal text-subtle tracking-normal">· toque para lançar</span>
          </p>
          <Input
            placeholder="Buscar produto…"
            value={produtoBusca}
            onChange={e => setProdutoBusca(e.target.value)}
            className="mb-2"
          />
          {(() => {
            const filtered = activeProducts.filter(p =>
              p.name.toLowerCase().includes(produtoBusca.trim().toLowerCase())
            )
            if (activeProducts.length === 0) {
              return <p className="text-sm text-muted py-4 text-center">Nenhum produto cadastrado.</p>
            }
            if (filtered.length === 0) {
              return <p className="text-sm text-muted py-4 text-center">Nenhum produto encontrado.</p>
            }
            return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filtered.map(p => {
                const inCart = c.items.find(i => i.productId === p.id)
                const out = p.quantity === 0
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={out || busy}
                    onClick={() => handleAdd(p)}
                    className={clsx(
                      'relative text-left p-3 rounded-[var(--radius-ctl)] border transition-colors',
                      out
                        ? 'border-line bg-surface-2 opacity-60 cursor-not-allowed'
                        : inCart
                        ? 'border-brand bg-brand-weak'
                        : 'border-line bg-surface hover:border-brand hover:bg-brand-weak/50'
                    )}
                  >
                    {inCart && (
                      <span className="absolute top-1.5 right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-ink truncate pr-6">{p.name}</p>
                    <p className="text-sm font-bold text-brand mt-0.5">{fmt(p.salePrice)}</p>
                    <p className="text-[11px] text-subtle mt-0.5">{out ? 'Esgotado' : `${p.quantity} em estoque`}</p>
                  </button>
                )
              })}
            </div>
          )
          })()}
        </div>

        {/* Itens lançados */}
        {c.items.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Itens</p>
            <div className="space-y-2">
              {c.items.map(item => (
                <div key={item.productId || 'horario'} className="flex items-center gap-3 bg-surface-2 border border-line rounded-[var(--radius-ctl)] px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {item.quantity}x {item.productName}
                    </p>
                    <p className="text-xs text-muted">{fmt(item.unitPrice)} cada</p>
                  </div>
                  <span className="text-sm font-semibold text-ink shrink-0">{fmt(item.total)}</span>
                  {item.productId !== HORARIO_ID && (
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      disabled={busy}
                      className="text-muted hover:text-danger transition-colors shrink-0 disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total + Desconto */}
        <div className="border-t border-line pt-3 space-y-2">
          <div className="flex items-end gap-3">
            <Input
              type="number"
              label="Desconto (R$)"
              value={descontoInput}
              onChange={e => setDescontoInput(e.target.value)}
              placeholder="0,00"
              min={0}
              className="flex-1"
            />
            <Button variant="secondary" onClick={handleDesconto} className="shrink-0 mb-0.5">
              Aplicar
            </Button>
          </div>
          {(() => {
            const desc = Number(descontoInput) || 0
            if (desc > 0) {
              return (
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-muted">Subtotal</span>
                    <span className="font-semibold text-ink">{fmt(c.total)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm text-danger">Desconto</span>
                    <span className="font-semibold text-danger">- {fmt(desc)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-line">
                    <span className="font-semibold text-muted">Total a pagar</span>
                    <span className="text-2xl font-bold text-success">{fmt(c.total - desc)}</span>
                  </div>
                </div>
              )
            }
            return (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-muted">Total</span>
                <span className="text-2xl font-bold text-success">{fmt(c.total)}</span>
              </div>
            )
          })()}
        </div>

        {/* Fechar */}
        <div className="space-y-3 border-t border-line pt-4">
          <Select
            label="Forma de pagamento"
            value={payment}
            onChange={e => setPayment(e.target.value as Sale['paymentMethod'])}
          >
            {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onExit} className="flex-1">
              Salvar e voltar
            </Button>
            <Button variant="primary" onClick={handleClose} loading={busy} className="flex-1" disabled={c.items.length === 0}>
              <Wallet size={16} /> Fechar {fmt(c.total - (Number(descontoInput) || 0))}
            </Button>
          </div>
          <p className="text-[11px] text-subtle text-center -mt-1">
            "Salvar e voltar" deixa a comanda aberta pra continuar depois. "Fechar" registra o pagamento.
          </p>
          <button
            type="button"
            onClick={handleCancel}
            disabled={busy}
            className="w-full text-center text-sm text-danger hover:underline disabled:opacity-40"
          >
            Cancelar comanda (devolve o estoque)
          </button>
        </div>
      </div>
    </Modal>
  )
}
