'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const R$ = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface RelData {
  totalReceita: number; totalCusto: number; lucroBruto: number; totalDespesas: number; lucroLiquido: number; totalVendas: number
  vendasPorDia: { data: string; receita: number; custo: number; lucro: number }[]
  topProdutos: { nome: string; quantidade: number; receita: number }[]
  pagamentos: { metodo: string; total: number; quantidade: number }[]
  despesasPorCategoria: { categoria: string; valor: number }[]
}

const CORES = ['#f59e0b','#3b82f6','#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6']
const pagLabel: Record<string,string> = { dinheiro:'Dinheiro', cartao:'Cartão', pix:'Pix', fiado:'Fiado' }
const getSemana = () => { const fim = new Date(); const ini = new Date(); ini.setDate(ini.getDate()-6); return { inicio: ini.toISOString().split('T')[0], fim: fim.toISOString().split('T')[0] } }
const getMes = () => { const h = new Date(); const ini = new Date(h.getFullYear(),h.getMonth(),1); const fim = new Date(h.getFullYear(),h.getMonth()+1,0); return { inicio: ini.toISOString().split('T')[0], fim: fim.toISOString().split('T')[0] } }
const getMesAnt = () => { const h = new Date(); const ini = new Date(h.getFullYear(),h.getMonth()-1,1); const fim = new Date(h.getFullYear(),h.getMonth(),0); return { inicio: ini.toISOString().split('T')[0], fim: fim.toISOString().split('T')[0] } }

export default function RelatoriosPage() {
  const [data, setData] = useState<RelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<'semana'|'mes'|'mes_anterior'|'custom'>('mes')
  const [customInicio, setCustomInicio] = useState('')
  const [customFim, setCustomFim] = useState('')

  const getRange = useCallback(() => { if (periodo === 'semana') return getSemana(); if (periodo === 'mes') return getMes(); if (periodo === 'mes_anterior') return getMesAnt(); return { inicio: customInicio, fim: customFim } }, [periodo, customInicio, customFim])
  const buscar = useCallback(() => { const { inicio, fim } = getRange(); if (!inicio || !fim) return; setLoading(true); fetch(`/api/relatorios?inicio=${inicio}&fim=${fim}`).then(r => r.json()).then(setData).finally(() => setLoading(false)) }, [getRange])
  useEffect(() => { if (periodo !== 'custom') buscar() }, [periodo, buscar])

  const Card = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) => (
    <div className={`rounded-xl p-5 text-white ${color}`}><p className="text-sm opacity-80">{label}</p><p className="text-2xl font-bold mt-1">{value}</p>{sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}</div>
  )

  return (
    <div className="p-8 space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Relatórios</h1><p className="text-gray-500 text-sm mt-1">Análise de desempenho do negócio</p></div>
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Período:</span>
          {([{value:'semana',label:'Últimos 7 dias'},{value:'mes',label:'Este mês'},{value:'mes_anterior',label:'Mês anterior'},{value:'custom',label:'Personalizado'}] as const).map(p => <button key={p.value} onClick={() => setPeriodo(p.value)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${periodo === p.value ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>{p.label}</button>)}
          {periodo === 'custom' && (<><input type="date" value={customInicio} onChange={e => setCustomInicio(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /><span className="text-gray-400">até</span><input type="date" value={customFim} onChange={e => setCustomFim(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" /><button onClick={buscar} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Buscar</button></>)}
        </div>
      </div>
      {loading ? <div className="flex items-center justify-center py-20 text-gray-400 text-lg">Carregando relatório...</div>
      : !data ? <div className="text-red-500 text-center py-10">Erro ao carregar dados.</div>
      : <>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          <Card label="Receita Total" value={R$(data.totalReceita)} sub={`${data.totalVendas} venda(s)`} color="bg-blue-500" />
          <Card label="Custo das Vendas" value={R$(data.totalCusto)} color="bg-orange-500" />
          <Card label="Lucro Bruto" value={R$(data.lucroBruto)} sub={data.totalReceita > 0 ? `Margem: ${((data.lucroBruto/data.totalReceita)*100).toFixed(1)}%` : ''} color={data.lucroBruto >= 0 ? 'bg-green-500' : 'bg-red-500'} />
          <Card label="Despesas" value={R$(data.totalDespesas)} color="bg-red-500" />
          <Card label="Lucro Líquido" value={R$(data.lucroLiquido)} sub={data.lucroLiquido >= 0 ? 'Resultado positivo' : 'Resultado negativo'} color={data.lucroLiquido >= 0 ? 'bg-emerald-600' : 'bg-red-700'} />
        </div>
        {data.vendasPorDia.length > 0 && <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"><h2 className="text-base font-semibold text-gray-800 mb-4">Receita e Lucro por Dia</h2><ResponsiveContainer width="100%" height={250}><BarChart data={data.vendasPorDia} margin={{top:0,right:10,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="data" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} tickFormatter={v => `R$${v}`} /><Tooltip formatter={(v:number) => R$(v)} /><Legend /><Bar dataKey="receita" name="Receita" fill="#3b82f6" radius={[3,3,0,0]} /><Bar dataKey="custo" name="Custo" fill="#f97316" radius={[3,3,0,0]} /><Bar dataKey="lucro" name="Lucro" fill="#10b981" radius={[3,3,0,0]} /></BarChart></ResponsiveContainer></div>}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Produtos Mais Vendidos</h2>
            {data.topProdutos.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">Sem dados no período.</p> : (
              <div className="space-y-3">{data.topProdutos.slice(0,8).map((p,i) => (<div key={i} className="flex items-center gap-3"><span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">{i+1}</span><div className="flex-1 min-w-0"><div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-800 truncate">{p.nome}</span><span className="text-gray-500 shrink-0 ml-2">{p.quantidade} un</span></div><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{width:`${(p.quantidade/data.topProdutos[0].quantidade)*100}%`}} /></div></div><span className="text-sm font-semibold text-gray-700 shrink-0">{R$(p.receita)}</span></div>))}</div>
            )}
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Formas de Pagamento</h2>
            {data.pagamentos.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">Sem dados no período.</p> : (
              <div className="flex gap-6 items-center">
                <ResponsiveContainer width={160} height={160}><PieChart><Pie data={data.pagamentos} dataKey="total" nameKey="metodo" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>{data.pagamentos.map((_,i) => <Cell key={i} fill={CORES[i%CORES.length]} />)}</Pie><Tooltip formatter={(v:number) => R$(v)} /></PieChart></ResponsiveContainer>
                <ul className="flex-1 space-y-2">{data.pagamentos.map((p,i) => <li key={i} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{background:CORES[i%CORES.length]}} /><span className="text-gray-700 capitalize">{pagLabel[p.metodo] ?? p.metodo}</span></span><div className="text-right"><span className="font-semibold text-gray-800">{R$(p.total)}</span><span className="text-gray-400 text-xs ml-1">({p.quantidade}x)</span></div></li>)}</ul>
              </div>
            )}
          </div>
          {data.despesasPorCategoria.length > 0 && <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 xl:col-span-2"><h2 className="text-base font-semibold text-gray-800 mb-4">Despesas por Categoria</h2><ResponsiveContainer width="100%" height={200}><BarChart data={data.despesasPorCategoria} layout="vertical" margin={{top:0,right:30,left:10,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} /><XAxis type="number" tick={{fontSize:11}} tickFormatter={v => `R$${v}`} /><YAxis type="category" dataKey="categoria" tick={{fontSize:11}} width={100} /><Tooltip formatter={(v:number) => R$(v)} /><Bar dataKey="valor" name="Valor" fill="#ef4444" radius={[0,4,4,0]} /></BarChart></ResponsiveContainer></div>}
        </div>
      </>}
    </div>
  )
}
