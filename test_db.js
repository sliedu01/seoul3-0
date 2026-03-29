const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const responses = await prisma.surveyResponse.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      session: {
        include: {
          program: true
        }
      }
    }
  })

  console.log(JSON.stringify(responses.map(r => ({
    programId: r.session.programId,
    programName: r.session.program.name,
    sessionDate: r.session.date,
    createdAt: r.createdAt
  })), null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
