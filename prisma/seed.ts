import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Criando produtos de exemplo...')

  const produtos = [
    { nome: 'Coxinha de Frango', categoria: 'Salgados Fritos', preco: 4.00, custo: 1.50, quantidade: 80, minimo: 20 },
    { nome: 'Coxinha de Frango Grande', categoria: 'Salgados Fritos', preco: 6.00, custo: 2.50, quantidade: 50, minimo: 15 },
    { nome: 'Pastel de Queijo', categoria: 'Salgados Fritos', preco: 5.00, custo: 2.00, quantidade: 60, minimo: 15 },
    { nome: 'Pastel de Carne', categoria: 'Salgados Fritos', preco: 5.00, custo: 2.00, quantidade: 60, minimo: 15 },
    { nome: 'Bolinha de Queijo', categoria: 'Salgados Fritos', preco: 3.50, custo: 1.20, quantidade: 100, minimo: 30 },
    { nome: 'Empadinha de Frango', categoria: 'Salgados Assados', preco: 4.50, custo: 1.80, quantidade: 40, minimo: 10 },
    { nome: 'Pao de Queijo', categoria: 'Salgados Assados', preco: 3.00, custo: 1.00, quantidade: 8, minimo: 20 },
    { nome: 'Enroladinho de Salsicha', categoria: 'Salgados Assados', preco: 3.50, custo: 1.30, quantidade: 70, minimo: 20 },
    { nome: 'Suco de Laranja 500ml', categoria: 'Bebidas', preco: 8.00, custo: 3.00, quantidade: 20, minimo: 10 },
    { nome: 'Refrigerante Lata', categoria: 'Bebidas', preco: 5.00, custo: 2.50, quantidade: 3, minimo: 12 },
  ]

  for (const p of produtos) {
    await prisma.produto.create({
      data: {
        nome: p.nome,
        categoria: p.categoria,
        preco: p.preco,
        custo: p.custo,
        estoque: {
          create: {
            quantidade: p.quantidade,
            minimo: p.minimo,
          },
        },
      },
    })
  }

  console.log('Produtos criados com sucesso!')
  console.log('Sistema Nupezzo pronto para uso!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
