const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.question.findMany();
  console.log(JSON.stringify(questions, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
