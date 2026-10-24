import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function fmt(d: Date) { return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` }

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const inicioStr = searchParams.get('inicio')
    const fimStr = searchParams.get('fim')
    const hoje = new Date()
    const inicio = inicioStr ? new Date(inicioStr) : new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fim = fimStr ? new Date(fimStr + 'T23:59:59') : new Date(hoje.getFullYear(), hoje.getMonth()+1, 0, 23, 59, 59)
    const vendas = await prisma.venda.findMany({ where: { data: { gte: inicio, lte: fim } }, include: { itens: true }, orderBy: { data: 'asc' } })
    const totalReceita = vendas.reduce((s, v) => s + v.total, 0)
    const totalCusto = vendas.reduce((s, v) => s + v.itens.reduce((si, i) => si + i.custoUnit * i.quantidade, 0), 0)
    const lucroBruto = totalReceita - totalCusto
    const despesas = await prisma.despesa.findMany({ where: { data: { gte: inicio, lte: fim } } })
    const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0)
    const lucroLiquido = lucroBruto - totalDespesas
    const diaMap: Record<string, { receita: number; custo: number }> = {}
    for (const v of vendas) {
      const k = fmt(new Date(v.data))
      if (!diaMap[k]) diaMap[k] = { receita: 0, custo: 0 }
      diaMap[k].receita += v.total
      diaMap[k].custo += v.itens.reduce((s, i) => s + i.custoUnit * i.quantidade, 0)
    }
    const vendasPorDia = Object.entries(diaMap).map(([data, v]) => ({ data, receita: v.receita, custo: v.custo, lucro: v.receita - v.custo }))
    const itemMap: Record<string, { nome: string; quantidade: number; receita: number }> = {}
    for (const v of vendas) {
      for (const item of v.itens) {
        const prod = await prisma.produto.findUnique({ where: { id: item.produtoId } })
        if (!itemMap[item.produtoId]) itemMap[item.produtoId] = { nome: prod?.nome ?? 'Desconhecido', quantidade: 0, receita: 0 }
        itemMap[item.produtoId].quantidade += item.quantidade
        itemMap[item.produtoId].receita += item.precoUnit * item.quantidade
      }
    }
    const topProdutos = Object.values(itemMap).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10)
    const pagMap: Record<string, { total: number; quantidade: number }> = {}
    for (const v of vendas) {
      if (!pagMap[v.formaPagamento]) pagMap[v.formaPagamento] = { total: 0, quantidade: 0 }
      pagMap[v.formaPagamento].total += v.total
      pagMap[v.formaPagamento].quantidade += 1
    }
    const pagamentos = Object.entries(pagMap).map(([metodo, v]) => ({ metodo, total: v.total, quantidade: v.quantidade }))
    const catMap: Record<string, number> = {}
    for (const d of despesas) catMap[d.categoria] = (catMap[d.categoria] ?? 0) + d.valor
    const despesasPorCategoria = Object.entries(catMap).map(([categoria, valor]) => ({ categoria, valor }))
    return NextResponse.json({ totalReceita, totalCusto, lucroBruto, totalDespesas, lucroLiquido, totalVendas: vendas.length, vendasPorDia, topProdutos, pagamentos, despesasPorCategoria })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
  }
}
