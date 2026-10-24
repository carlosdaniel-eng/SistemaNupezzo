import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    const produto = await prisma.produto.update({
      where: { id: params.id },
      data: {
        nome: data.nome,
        descricao: data.descricao || null,
        categoria: data.categoria,
        preco: parseFloat(data.preco),
        custo: parseFloat(data.custo),
        unidade: data.unidade || 'unidade',
      },
      include: { estoque: true },
    })
    return NextResponse.json(produto)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.produto.update({
      where: { id: params.id },
      data: { ativo: false },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao remover produto' }, { status: 500 })
  }
}
