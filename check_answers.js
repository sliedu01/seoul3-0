const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const answers = await prisma.answer.findMany({
    where: {
      text: { not: null },
      response: {
        session: {
          programId: 'cmn0mtgg60002em5gd4zfs361'
        }
      }
    },
    include: {
      question: true
    }
  })

  console.log(JSON.stringify(answers.map(a => ({
    question: a.question.content,
    answer: a.text
  })), null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
