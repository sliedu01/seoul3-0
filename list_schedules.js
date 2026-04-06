const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const others = await prisma.otherSchedule.findMany();
  console.log('OtherSchedules:', JSON.stringify(others, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);
