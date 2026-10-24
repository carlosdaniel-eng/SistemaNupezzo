'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react'

const R$ = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface Estoque { quantidade: number; minimo: number }
interface Produto { id: string; nome: string; descricao: string | null; categoria: string; preco: number; custo: number; unidade: string; ativo: boolean; estoque: Estoque | null }

const CATEGORIAS = ['Salgados Fritos','Salgados Assados','Bebidas','Doces','Outros']
const UNIDADES = ['unidade','dúzia','pacote','100g','500g','1kg']
const initialForm = { nome: '', descricao: '', categoria: 'Salgados Fritos', preco: '', custo: '', unidade: 'unidade', quantidadeInicial: '0', estoqueMinimo: '5' }

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [form, setForm] = useState(initialForm)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const fetchProdutos = () => { setLoading(true); fetch('/api/produtos').then(r => r.json()).then(setProdutos).finally(() => setLoading(false)) }
  useEffect(() => { fetchProdutos() }, [])

  const abrirCriacao = () => { setEditando(null); setForm(initialForm); setErro(''); setShowModal(true) }
  const abrirEdicao = (p: Produto) => { setEditando(p); setForm({ nome: p.nome, descricao: p.descricao ?? '', categoria: p.categoria, preco: String(p.preco), custo: String(p.custo), unidade: p.unidade, quantidadeInicial: String(p.estoque?.quantidade ?? 0), estoqueMinimo: String(p.estoque?.minimo ?? 5) }); setErro(''); setShowModal(true) }

  const salvar = async () => {
    if (!form.nome || !form.preco || !form.custo) { setErro('Preencha nome, preço de venda e custo.'); return }
    setSalvando(true); setErro('')
    try {
      const res = await fetch(editando ? `/api/produtos/${editando.id}` : '/api/produtos', { method: editando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      setShowModal(false); fetchProdutos()
    } catch { setErro('Erro ao salvar produto.') } finally { setSalvando(false) }
  }

  const remover = async (id: string, nome: string) => { if (!confirm(`Remover "${nome}"?`)) return; await fetch(`/api/produtos/${id}`, { method: 'DELETE' }); fetchProdutos() }
  const filtrados = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || p.categoria.toLowerCase().includes(busca.toLowerCase()))
  const margem = (preco: number, custo: number) => preco > 0 ? (((preco-custo)/preco)*100).toFixed(0)+'%' : '-'

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Produtos</h1><p className="text-gray-500 text-sm mt-1">Gerencie o cardápio da Nupezzo</p></div>
        <button onClick={abrirCriacao} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"><Plus size={18} />Novo Produto</button>
      </div>
      <div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-300" /></div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr><th className="px-6 py-3 text-left">Produto</th><th className="px-6 py-3 text-left">Categoria</th><th className="px-6 py-3 text-right">Custo</th><th className="px-6 py-3 text-right">Preço</th><th className="px-6 py-3 text-right">Margem</th><th className="px-6 py-3 text-right">Estoque</th><th className="px-6 py-3 text-center">Ações</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Carregando...</td></tr>
            : filtrados.length === 0 ? <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">{busca ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.'}</td></tr>
            : filtrados.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4"><p className="font-medium text-gray-900">{p.nome}</p>{p.descricao && <p className="text-gray-400 text-xs">{p.descricao}</p>}</td>
                <td className="px-6 py-4"><span className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">{p.categoria}</span></td>
                <td className="px-6 py-4 text-right text-gray-600">{R$(p.custo)}</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900">{R$(p.preco)}</td>
                <td className="px-6 py-4 text-right"><span className="text-green-600 font-medium">{margem(p.preco, p.custo)}</span></td>
                <td className="px-6 py-4 text-right">{p.estoque ? <span className={`font-medium ${p.estoque.quantidade <= p.estoque.minimo ? 'text-red-500' : 'text-gray-700'}`}>{p.estoque.quantidade} {p.unidade}</span> : <span className="text-gray-400">-</span>}</td>
                <td className="px-6 py-4"><div className="flex items-center justify-center gap-2"><button onClick={() => abrirEdicao(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Pencil size={15} /></button><button onClick={() => remover(p.id, p.nome)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={15} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100"><h2 className="text-lg font-semibold text-gray-900">{editando ? 'Editar Produto' : 'Novo Produto'}</h2><button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              {erro && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label><input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="Ex: Coxinha de Frango" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label><select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300">{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label><select value={form.unidade} onChange={e => setForm({...form, unidade: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300">{UNIDADES.map(u => <option key={u}>{u}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Custo de Produção (R$) *</label><input type="number" step="0.01" min="0" value={form.custo} onChange={e => setForm({...form, custo: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="0,00" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda (R$) *</label><input type="number" step="0.01" min="0" value={form.preco} onChange={e => setForm({...form, preco: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="0,00" /></div>
                {!editando && (<><div><label className="block text-sm font-medium text-gray-700 mb-1">Qtd. Inicial em Estoque</label><input type="number" min="0" value={form.quantidadeInicial} onChange={e => setForm({...form, quantidadeInicial: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Estoque Mínimo (alerta)</label><input type="number" min="0" value={form.estoqueMinimo} onChange={e => setForm({...form, estoqueMinimo: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /></div></>)}
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label><input type="text" value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="Ex: Recheio de frango com catupiry" /></div>
                {form.preco && form.custo && <div className="col-span-2 bg-green-50 rounded-lg p-3 text-sm text-green-700">Margem de lucro: <strong>{(((parseFloat(form.preco)-parseFloat(form.custo))/parseFloat(form.preco))*100).toFixed(1)}%</strong> — Lucro por unidade: <strong>{R$(parseFloat(form.preco)-parseFloat(form.custo))}</strong></div>}
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100"><button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button><button onClick={salvar} disabled={salvando} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">{salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Produto'}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
