const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const s = await prisma.otherSchedule.findMany({
    where: { title: { contains: 'Test Fix' } }
  });
  console.log('Schedules:', JSON.stringify(s, null, 2));
  await prisma.$disconnect();
}
main().catch(console.error);
