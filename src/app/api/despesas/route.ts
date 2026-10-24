import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const despesas = await prisma.despesa.findMany({ orderBy: { data: 'desc' } })
    return NextResponse.json(despesas)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar despesas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const despesa = await prisma.despesa.create({
      data: {
        descricao: data.descricao,
        valor: parseFloat(data.valor),
        categoria: data.categoria,
        data: data.data ? new Date(data.data) : new Date(),
      },
    })
    return NextResponse.json(despesa, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao registrar despesa' }, { status: 500 })
  }
}
