import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limite = parseInt(searchParams.get('limite') ?? '50')
    const pagina = parseInt(searchParams.get('pagina') ?? '1')

    const vendas = await prisma.venda.findMany({
      include: { itens: { include: { produto: true } } },
      orderBy: { data: 'desc' },
      take: limite,
      skip: (pagina - 1) * limite,
    })
    const total = await prisma.venda.count()
    return NextResponse.json({ vendas, total })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar vendas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const venda = await prisma.$transaction(async (tx) => {
      const novaVenda = await tx.venda.create({
        data: {
          total: parseFloat(data.total),
          desconto: parseFloat(data.desconto ?? 0),
          formaPagamento: data.formaPagamento ?? 'dinheiro',
          observacao: data.observacao || null,
          itens: {
            create: data.itens.map((item: { produtoId: string; quantidade: number; precoUnit: number; custoUnit: number }) => ({
              produtoId: item.produtoId,
              quantidade: parseFloat(String(item.quantidade)),
              precoUnit: parseFloat(String(item.precoUnit)),
              custoUnit: parseFloat(String(item.custoUnit)),
            })),
          },
        },
        include: { itens: { include: { produto: true } } },
      })
      for (const item of data.itens) {
        await tx.estoque.updateMany({
          where: { produtoId: item.produtoId },
          data: { quantidade: { decrement: parseFloat(String(item.quantidade)) } },
        })
      }
      return novaVenda
    })
    return NextResponse.json(venda, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao registrar venda' }, { status: 500 })
  }
}
