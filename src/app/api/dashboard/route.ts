import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0,0,0,0); return r }
function endOfDay(d: Date) { const r = new Date(d); r.setHours(23,59,59,999); return r }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0, 23, 59, 59, 999) }
function subDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate()-n); return r }
function fmt(d: Date) { return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` }

export async function GET() {
  try {
    const hoje = new Date()
    const vendasHoje = await prisma.venda.aggregate({ where: { data: { gte: startOfDay(hoje), lte: endOfDay(hoje) } }, _sum: { total: true }, _count: true })
    const vendasMes = await prisma.venda.aggregate({ where: { data: { gte: startOfMonth(hoje), lte: endOfMonth(hoje) } }, _sum: { total: true }, _count: true })
    const itensMes = await prisma.itemVenda.findMany({ where: { venda: { data: { gte: startOfMonth(hoje), lte: endOfMonth(hoje) } } }, select: { quantidade: true, custoUnit: true } })
    const custoMes = itensMes.reduce((s, i) => s + i.custoUnit * i.quantidade, 0)
    const despesasAgr = await prisma.despesa.aggregate({ where: { data: { gte: startOfMonth(hoje), lte: endOfMonth(hoje) } }, _sum: { valor: true } })
    const despesasMes = despesasAgr._sum.valor ?? 0
    const receitaMes = vendasMes._sum.total ?? 0
    const lucroBrutoMes = receitaMes - custoMes
    const lucroLiquidoMes = lucroBrutoMes - despesasMes
    const todoEstoque = await prisma.estoque.findMany({ include: { produto: true } })
    const estoqueAlerta = todoEstoque.filter(e => e.produto.ativo && e.quantidade <= e.minimo)
    const ultimasVendas = await prisma.venda.findMany({ take: 6, orderBy: { data: 'desc' }, include: { itens: { include: { produto: true } } } })
    const vendasSemana = []
    for (let i = 6; i >= 0; i--) {
      const dia = subDays(hoje, i)
      const agg = await prisma.venda.aggregate({ where: { data: { gte: startOfDay(dia), lte: endOfDay(dia) } }, _sum: { total: true }, _count: true })
      vendasSemana.push({ data: fmt(dia), total: agg._sum.total ?? 0, quantidade: agg._count })
    }
    const topRaw = await prisma.itemVenda.groupBy({ by: ['produtoId'], where: { venda: { data: { gte: startOfMonth(hoje), lte: endOfMonth(hoje) } } }, _sum: { quantidade: true }, orderBy: { _sum: { quantidade: 'desc' } }, take: 5 })
    const topProdutos = await Promise.all(topRaw.map(async p => { const prod = await prisma.produto.findUnique({ where: { id: p.produtoId } }); return { nome: prod?.nome ?? 'Desconhecido', quantidade: p._sum.quantidade ?? 0 } }))
    return NextResponse.json({ vendasHoje: { total: vendasHoje._sum.total ?? 0, quantidade: vendasHoje._count }, vendasMes: { total: receitaMes, quantidade: vendasMes._count }, custoMes, lucroBrutoMes, despesasMes, lucroLiquidoMes, estoqueAlerta, ultimasVendas, vendasSemana, topProdutos })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 })
  }
}
