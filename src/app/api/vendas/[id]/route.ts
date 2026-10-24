import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id: params.id },
      include: { itens: { include: { produto: true } } },
    })
    if (!venda) return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    return NextResponse.json(venda)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar venda' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.$transaction(async (tx) => {
      const venda = await tx.venda.findUnique({
        where: { id: params.id },
        include: { itens: true },
      })
      if (!venda) throw new Error('Venda não encontrada')
      for (const item of venda.itens) {
        await tx.estoque.updateMany({
          where: { produtoId: item.produtoId },
          data: { quantidade: { increment: item.quantidade } },
        })
      }
      await tx.venda.delete({ where: { id: params.id } })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cancelar venda' }, { status: 500 })
  }
}
