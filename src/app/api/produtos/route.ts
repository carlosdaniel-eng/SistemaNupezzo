import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      include: { estoque: true },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(produtos)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const produto = await prisma.produto.create({
      data: {
        nome: data.nome,
        descricao: data.descricao || null,
        categoria: data.categoria,
        preco: parseFloat(data.preco),
        custo: parseFloat(data.custo),
        unidade: data.unidade || 'unidade',
        estoque: {
          create: {
            quantidade: parseFloat(data.quantidadeInicial || 0),
            minimo: parseFloat(data.estoqueMinimo || 5),
          },
        },
      },
      include: { estoque: true },
    })
    return NextResponse.json(produto, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }
}
