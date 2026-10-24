'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, ShoppingCart, CheckCircle, X } from 'lucide-react'

const R$ = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const formatDT = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

interface Produto { id: string; nome: string; preco: number; custo: number; categoria: string; unidade: string; estoque: { quantidade: number } | null }
interface CartItem { produtoId: string; nome: string; precoUnit: number; custoUnit: number; quantidade: number }
interface Venda { id: string; data: string; total: number; desconto: number; formaPagamento: string; itens: { quantidade: number; precoUnit: number; produto: { nome: string } }[] }

const PAGAMENTOS = [{ value: 'dinheiro', label: 'Dinheiro' }, { value: 'pix', label: 'Pix' }, { value: 'cartao', label: 'Cartão' }, { value: 'fiado', label: 'Fiado' }]

export default function VendasPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [vendas, setVendas] = useState<Venda[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [desconto, setDesconto] = useState(0)
  const [pagamento, setPagamento] = useState('dinheiro')
  const [observacao, setObservacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [detalhe, setDetalhe] = useState<Venda | null>(null)

  const fetchDados = () => { fetch('/api/produtos').then(r => r.json()).then(setProdutos); fetch('/api/vendas').then(r => r.json()).then(d => setVendas(d.vendas ?? [])) }
  useEffect(() => { fetchDados() }, [])

  const adicionarItem = () => {
    const produto = produtos.find(p => p.id === produtoId)
    if (!produto) { setErro('Selecione um produto.'); return }
    if (quantidade <= 0) { setErro('Quantidade deve ser maior que zero.'); return }
    setErro('')
    setCart(prev => { const ex = prev.find(i => i.produtoId === produtoId); if (ex) return prev.map(i => i.produtoId === produtoId ? {...i, quantidade: i.quantidade + quantidade} : i); return [...prev, { produtoId: produto.id, nome: produto.nome, precoUnit: produto.preco, custoUnit: produto.custo, quantidade }] })
    setProdutoId(''); setQuantidade(1)
  }

  const subtotal = cart.reduce((s, i) => s + i.precoUnit * i.quantidade, 0)
  const total = Math.max(0, subtotal - desconto)

  const finalizarVenda = async () => {
    if (cart.length === 0) { setErro('Adicione pelo menos um produto.'); return }
    setEnviando(true); setErro('')
    try {
      const res = await fetch('/api/vendas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ total, desconto, formaPagamento: pagamento, observacao, itens: cart.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade, precoUnit: i.precoUnit, custoUnit: i.custoUnit })) }) })
      if (!res.ok) throw new Error()
      setCart([]); setDesconto(0); setObservacao(''); setPagamento('dinheiro')
      setSucesso(true); setTimeout(() => setSucesso(false), 3000); fetchDados()
    } catch { setErro('Erro ao registrar venda. Tente novamente.') } finally { setEnviando(false) }
  }

  const cancelarVenda = async (id: string) => { if (!confirm('Cancelar esta venda? O estoque será devolvido.')) return; await fetch(`/api/vendas/${id}`, { method: 'DELETE' }); fetchDados() }

  return (
    <div className="p-8 space-y-8">
      <div><h1 className="text-2xl font-bold text-gray-900">Vendas</h1><p className="text-gray-500 text-sm mt-1">Registre vendas e acompanhe o histórico</p></div>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5 h-fit">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2"><ShoppingCart size={18} className="text-amber-500" />Nova Venda</h2>
          {sucesso && <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm"><CheckCircle size={16} />Venda registrada com sucesso!</div>}
          {erro && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Produto</label>
            <select value={produtoId} onChange={e => setProdutoId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"><option value="">Selecione um produto...</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome} — {R$(p.preco)} (estoque: {p.estoque?.quantidade ?? 0})</option>)}</select>
            <div className="flex gap-2">
              <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label><input type="number" min="1" value={quantidade} onChange={e => setQuantidade(parseInt(e.target.value) || 1)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
              <div className="flex items-end"><button onClick={adicionarItem} className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"><Plus size={16} />Adicionar</button></div>
            </div>
          </div>
          {cart.length > 0 && <div className="space-y-2"><p className="text-sm font-medium text-gray-700">Itens do pedido</p><div className="border border-gray-100 rounded-lg divide-y divide-gray-100">{cart.map(item => <div key={item.produtoId} className="flex items-center justify-between px-3 py-2.5"><div className="text-sm"><p className="font-medium text-gray-800">{item.nome}</p><p className="text-gray-400 text-xs">{item.quantidade}x {R$(item.precoUnit)}</p></div><div className="flex items-center gap-2"><span className="text-sm font-semibold text-gray-900">{R$(item.quantidade * item.precoUnit)}</span><button onClick={() => setCart(prev => prev.filter(i => i.produtoId !== item.produtoId))} className="text-gray-300 hover:text-red-500 transition-colors"><X size={14} /></button></div></div>)}</div></div>}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span className="font-medium">{R$(subtotal)}</span></div>
            <div className="flex items-center justify-between gap-3"><label className="text-sm text-gray-600 shrink-0">Desconto (R$)</label><input type="number" min="0" step="0.50" value={desconto} onChange={e => setDesconto(parseFloat(e.target.value) || 0)} className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
            <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-100 pt-2"><span>Total</span><span className="text-amber-600">{R$(total)}</span></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label><div className="grid grid-cols-2 gap-2">{PAGAMENTOS.map(p => <button key={p.value} onClick={() => setPagamento(p.value)} className={`py-2 rounded-lg text-sm font-medium border transition-colors ${pagamento === p.value ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>{p.label}</button>)}</div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label><input type="text" value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: Mesa 3, para levar..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
          <button onClick={finalizarVenda} disabled={enviando || cart.length === 0} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-colors">{enviando ? 'Registrando...' : `Finalizar Venda — ${R$(total)}`}</button>
        </div>
        <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100"><h2 className="text-base font-semibold text-gray-800">Histórico de Vendas</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr><th className="px-5 py-3 text-left">Data / Hora</th><th className="px-5 py-3 text-left">Itens</th><th className="px-5 py-3 text-left">Pagamento</th><th className="px-5 py-3 text-right">Total</th><th className="px-5 py-3 text-center">Ação</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {vendas.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Nenhuma venda registrada ainda.</td></tr>
                : vendas.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{formatDT(v.data)}</td>
                    <td className="px-5 py-3 text-gray-700 max-w-xs"><button onClick={() => setDetalhe(v)} className="text-left hover:text-amber-600 transition-colors">{v.itens.map(i => `${i.quantidade}x ${i.produto.nome}`).join(', ')}</button></td>
                    <td className="px-5 py-3"><span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded capitalize">{v.formaPagamento}</span></td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{R$(v.total)}</td>
                    <td className="px-5 py-3 text-center"><button onClick={() => cancelarVenda(v.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {detalhe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-900">Detalhe da Venda</h2><button onClick={() => setDetalhe(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">{formatDT(detalhe.data)}</p>
              <table className="w-full text-sm"><thead className="text-gray-500 text-xs uppercase"><tr><th className="py-2 text-left">Produto</th><th className="py-2 text-right">Qtd</th><th className="py-2 text-right">Unit.</th><th className="py-2 text-right">Subtotal</th></tr></thead><tbody className="divide-y divide-gray-100">{detalhe.itens.map((item, i) => <tr key={i}><td className="py-2 text-gray-800">{item.produto.nome}</td><td className="py-2 text-right text-gray-600">{item.quantidade}</td><td className="py-2 text-right text-gray-600">{R$(item.precoUnit)}</td><td className="py-2 text-right font-medium">{R$(item.quantidade * item.precoUnit)}</td></tr>)}</tbody></table>
              <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
                {detalhe.desconto > 0 && <div className="flex justify-between text-gray-500"><span>Desconto</span><span>- {R$(detalhe.desconto)}</span></div>}
                <div className="flex justify-between font-bold text-gray-900 text-base"><span>Total</span><span className="text-amber-600">{R$(detalhe.total)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Pagamento</span><span className="capitalize">{detalhe.formaPagamento}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
