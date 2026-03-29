const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const programs = await prisma.program.findMany();
  console.log(JSON.stringify(programs, null, 2));
}

main().finally(() => prisma.$disconnect());
