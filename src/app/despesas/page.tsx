'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'

const R$ = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const formatData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

interface Despesa { id: string; descricao: string; valor: number; categoria: string; data: string }
const CATEGORIAS = ['Ingredientes','Embalagens','Energia Elétrica','Gás','Aluguel','Salários','Transporte','Manutenção','Outros']
const initialForm = { descricao: '', valor: '', categoria: 'Ingredientes', data: new Date().toISOString().split('T')[0] }

export default function DespesasPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')

  const fetchDespesas = () => { setLoading(true); fetch('/api/despesas').then(r => r.json()).then(setDespesas).finally(() => setLoading(false)) }
  useEffect(() => { fetchDespesas() }, [])

  const salvar = async () => {
    if (!form.descricao || !form.valor || parseFloat(form.valor) <= 0) { setErro('Preencha a descrição e o valor.'); return }
    setSalvando(true); setErro('')
    try {
      const res = await fetch('/api/despesas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      setForm(initialForm); setShowForm(false); fetchDespesas()
    } catch { setErro('Erro ao registrar despesa.') } finally { setSalvando(false) }
  }

  const remover = async (id: string) => { if (!confirm('Remover esta despesa?')) return; await fetch(`/api/despesas/${id}`, { method: 'DELETE' }); fetchDespesas() }
  const categorias = ['Todas', ...Array.from(new Set(despesas.map(d => d.categoria)))]
  const filtradas = filtroCategoria === 'Todas' ? despesas : despesas.filter(d => d.categoria === filtroCategoria)
  const totalFiltrado = filtradas.reduce((s, d) => s + d.valor, 0)
  const porCategoria: Record<string, number> = {}
  for (const d of despesas) porCategoria[d.categoria] = (porCategoria[d.categoria] ?? 0) + d.valor
  const totalGeral = despesas.reduce((s, d) => s + d.valor, 0)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Despesas</h1><p className="text-gray-500 text-sm mt-1">Registre os custos e gastos do negócio</p></div>
        <button onClick={() => { setShowForm(true); setErro('') }} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"><Plus size={18} />Nova Despesa</button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">{categorias.map(c => <button key={c} onClick={() => setFiltroCategoria(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filtroCategoria === c ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>{c}</button>)}</div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center"><span className="text-xs text-gray-500 uppercase font-medium">{filtradas.length} registro(s)</span><span className="text-sm font-semibold text-gray-800">Total: <span className="text-red-600">{R$(totalFiltrado)}</span></span></div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr><th className="px-6 py-3 text-left">Descrição</th><th className="px-6 py-3 text-left">Categoria</th><th className="px-6 py-3 text-left">Data</th><th className="px-6 py-3 text-right">Valor</th><th className="px-6 py-3 text-center">Ação</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Carregando...</td></tr>
                : filtradas.length === 0 ? <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Nenhuma despesa encontrada.</td></tr>
                : filtradas.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-800 font-medium">{d.descricao}</td>
                    <td className="px-6 py-3"><span className="bg-red-50 text-red-700 text-xs font-medium px-2 py-1 rounded-full">{d.categoria}</span></td>
                    <td className="px-6 py-3 text-gray-500">{formatData(d.data)}</td>
                    <td className="px-6 py-3 text-right font-semibold text-red-600">{R$(d.valor)}</td>
                    <td className="px-6 py-3 text-center"><button onClick={() => remover(d.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Resumo por Categoria</h2>
          {Object.keys(porCategoria).length === 0 ? <p className="text-gray-400 text-sm text-center py-4">Sem despesas registradas.</p> : (
            <ul className="space-y-3">{Object.entries(porCategoria).sort(([,a],[,b]) => b-a).map(([cat, valor]) => (<li key={cat}><div className="flex justify-between text-sm mb-1"><span className="text-gray-700 font-medium">{cat}</span><span className="text-red-600 font-semibold">{R$(valor)}</span></div><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${(valor/totalGeral)*100}%` }} /></div></li>))}</ul>
          )}
          {totalGeral > 0 && <div className="mt-4 pt-4 border-t border-gray-100"><div className="flex justify-between text-sm font-bold text-gray-900"><span>Total Geral</span><span className="text-red-600">{R$(totalGeral)}</span></div></div>}
        </div>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-900">Nova Despesa</h2><button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              {erro && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label><input type="text" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="Ex: Compra de farinha de trigo" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label><select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300">{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label><input type="number" min="0.01" step="0.01" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="0,00" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Data</label><input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100"><button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button><button onClick={salvar} disabled={salvando} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">{salvando ? 'Salvando...' : 'Registrar Despesa'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
