import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: { produtoId: string } }
) {
  try {
    const data = await request.json()
    const estoque = await prisma.estoque.upsert({
      where: { produtoId: params.produtoId },
      update: {
        quantidade: parseFloat(data.quantidade),
        minimo: parseFloat(data.minimo ?? 5),
      },
      create: {
        produtoId: params.produtoId,
        quantidade: parseFloat(data.quantidade),
        minimo: parseFloat(data.minimo ?? 5),
      },
    })
    return NextResponse.json(estoque)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar estoque' }, { status: 500 })
  }
}
