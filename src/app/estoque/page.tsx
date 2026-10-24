'use client'

import { useEffect, useState } from 'react'
import { Pencil, X, AlertTriangle, CheckCircle, Search } from 'lucide-react'

interface Estoque { id: string; quantidade: number; minimo: number }
interface Produto { id: string; nome: string; categoria: string; unidade: string; estoque: Estoque | null }

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos'|'alerta'|'ok'>('todos')
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Produto | null>(null)
  const [formQtd, setFormQtd] = useState('')
  const [formMin, setFormMin] = useState('')
  const [salvando, setSalvando] = useState(false)

  const fetchProdutos = () => { setLoading(true); fetch('/api/produtos').then(r => r.json()).then(setProdutos).finally(() => setLoading(false)) }
  useEffect(() => { fetchProdutos() }, [])

  const abrirEdicao = (p: Produto) => { setEditando(p); setFormQtd(String(p.estoque?.quantidade ?? 0)); setFormMin(String(p.estoque?.minimo ?? 5)) }
  const salvarEstoque = async () => {
    if (!editando) return
    setSalvando(true)
    await fetch(`/api/estoque/${editando.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantidade: formQtd, minimo: formMin }) })
    setSalvando(false); setEditando(null); fetchProdutos()
  }

  const status = (p: Produto) => { if (!p.estoque) return 'sem-estoque'; if (p.estoque.quantidade === 0) return 'zerado'; if (p.estoque.quantidade <= p.estoque.minimo) return 'baixo'; return 'ok' }
  const totalAlerta = produtos.filter(p => { const s = status(p); return s === 'baixo' || s === 'zerado' }).length
  const filtrados = produtos.filter(p => { const s = status(p); if (filtro === 'alerta') return s === 'baixo' || s === 'zerado'; if (filtro === 'ok') return s === 'ok'; return true }).filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || p.categoria.toLowerCase().includes(busca.toLowerCase()))

  const statusBadge = (p: Produto) => { const s = status(p); if (s === 'zerado') return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full"><AlertTriangle size={12}/>Zerado</span>; if (s === 'baixo') return <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><AlertTriangle size={12}/>Baixo</span>; return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full"><CheckCircle size={12}/>OK</span> }

  return (
    <div className="p-8 space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Estoque</h1><p className="text-gray-500 text-sm mt-1">Controle de quantidade de produtos</p></div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
          {(['todos','alerta','ok'] as const).map(f => <button key={f} onClick={() => setFiltro(f)} className={`px-4 py-2 font-medium transition-colors ${filtro === f ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{f === 'todos' ? 'Todos' : f === 'alerta' ? `Alerta (${totalAlerta})` : 'OK'}</button>)}
        </div>
        <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr><th className="px-6 py-3 text-left">Produto</th><th className="px-6 py-3 text-left">Categoria</th><th className="px-6 py-3 text-right">Quantidade</th><th className="px-6 py-3 text-right">Estoque Mínimo</th><th className="px-6 py-3 text-center">Status</th><th className="px-6 py-3 text-center">Ação</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Carregando...</td></tr>
            : filtrados.length === 0 ? <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Nenhum produto encontrado.</td></tr>
            : filtrados.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{p.nome}</td>
                <td className="px-6 py-4 text-gray-500">{p.categoria}</td>
                <td className="px-6 py-4 text-right"><span className={`font-semibold ${status(p) !== 'ok' ? 'text-red-600' : 'text-gray-800'}`}>{p.estoque?.quantidade ?? 0}</span><span className="text-gray-400 ml-1">{p.unidade}</span></td>
                <td className="px-6 py-4 text-right text-gray-500">{p.estoque?.minimo ?? '-'}</td>
                <td className="px-6 py-4 text-center">{statusBadge(p)}</td>
                <td className="px-6 py-4 text-center"><button onClick={() => abrirEdicao(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Pencil size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-900">Ajustar Estoque</h2><button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <p className="text-sm font-medium text-gray-700">{editando.nome}</p>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantidade em Estoque</label><input type="number" min="0" step="1" value={formQtd} onChange={e => setFormQtd(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo (alerta)</label><input type="number" min="0" step="1" value={formMin} onChange={e => setFormMin(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100"><button onClick={() => setEditando(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button><button onClick={salvarEstoque} disabled={salvando} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">{salvando ? 'Salvando...' : 'Salvar'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
