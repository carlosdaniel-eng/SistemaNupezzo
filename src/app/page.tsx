'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, AlertTriangle, Package } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const R$ = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface DashboardData {
  vendasHoje: { total: number; quantidade: number }
  vendasMes: { total: number; quantidade: number }
  custoMes: number
  lucroBrutoMes: number
  despesasMes: number
  lucroLiquidoMes: number
  estoqueAlerta: { id: string; quantidade: number; minimo: number; produto: { nome: string; categoria: string } }[]
  ultimasVendas: { id: string; data: string; total: number; formaPagamento: string; itens: { quantidade: number; produto: { nome: string } }[] }[]
  vendasSemana: { data: string; total: number; quantidade: number }[]
  topProdutos: { nome: string; quantidade: number }[]
}

function StatCard({ label, value, sub, icon: Icon, color, positive }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string; positive?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}><Icon size={22} className="text-white" /></div>
      </div>
      {positive !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-sm ${positive ? 'text-green-600' : 'text-red-500'}`}>
          {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{positive ? 'Positivo este mês' : 'Negativo este mês'}</span>
        </div>
      )}
    </div>
  )
}

const pagLabel: Record<string, string> = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'Pix', fiado: 'Fiado' }

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-gray-400 text-lg">Carregando...</div></div>
  if (!data) return <div className="p-8 text-red-500">Erro ao carregar dados.</div>

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do negócio</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Vendas Hoje" value={R$(data.vendasHoje.total)} sub={`${data.vendasHoje.quantidade} venda(s)`} icon={ShoppingCart} color="bg-blue-500" />
        <StatCard label="Receita do Mês" value={R$(data.vendasMes.total)} sub={`${data.vendasMes.quantidade} venda(s)`} icon={DollarSign} color="bg-amber-500" />
        <StatCard label="Lucro Bruto do Mês" value={R$(data.lucroBrutoMes)} sub={`Custo: ${R$(data.custoMes)}`} icon={TrendingUp} color={data.lucroBrutoMes >= 0 ? 'bg-green-500' : 'bg-red-500'} positive={data.lucroBrutoMes >= 0} />
        <StatCard label="Lucro Líquido do Mês" value={R$(data.lucroLiquidoMes)} sub={`Despesas: ${R$(data.despesasMes)}`} icon={data.lucroLiquidoMes >= 0 ? TrendingUp : TrendingDown} color={data.lucroLiquidoMes >= 0 ? 'bg-emerald-600' : 'bg-red-600'} positive={data.lucroLiquidoMes >= 0} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Vendas — Últimos 7 Dias</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.vendasSemana} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="data" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${v}`} />
              <Tooltip formatter={(v: number) => R$(v)} labelFormatter={l => `Dia ${l}`} />
              <Bar dataKey="total" name="Total" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-base font-semibold text-gray-800">Estoque em Alerta</h2>
            {data.estoqueAlerta.length > 0 && <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{data.estoqueAlerta.length}</span>}
          </div>
          {data.estoqueAlerta.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-gray-400"><Package size={32} className="mb-2 opacity-40" /><p className="text-sm">Estoque em dia!</p></div>
          ) : (
            <ul className="space-y-3">
              {data.estoqueAlerta.map(e => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <div><p className="font-medium text-gray-800">{e.produto.nome}</p><p className="text-gray-400 text-xs">{e.produto.categoria}</p></div>
                  <div className="text-right"><span className={`font-bold ${e.quantidade === 0 ? 'text-red-600' : 'text-amber-600'}`}>{e.quantidade} un</span><p className="text-gray-400 text-xs">mín: {e.minimo}</p></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100"><h2 className="text-base font-semibold text-gray-800">Últimas Vendas</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr><th className="px-6 py-3 text-left">Itens</th><th className="px-6 py-3 text-left">Pagamento</th><th className="px-6 py-3 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.ultimasVendas.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Nenhuma venda registrada ainda.</td></tr>
              ) : data.ultimasVendas.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-700">{v.itens.map(i => `${i.quantidade}x ${i.produto.nome}`).join(', ')}</td>
                  <td className="px-6 py-3"><span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">{pagLabel[v.formaPagamento] ?? v.formaPagamento}</span></td>
                  <td className="px-6 py-3 text-right font-semibold text-gray-900">{R$(v.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Top Produtos do Mês</h2>
          {data.topProdutos.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">Sem vendas este mês.</p> : (
            <ul className="space-y-3">
              {data.topProdutos.map((p, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">{i+1}</span>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{p.nome}</p></div>
                  <span className="text-sm text-gray-500 shrink-0">{p.quantidade} un</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
