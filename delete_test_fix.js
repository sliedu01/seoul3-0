const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.otherSchedule.deleteMany({
    where: { title: 'Test Fix' }
  });
  console.log('Deleted count:', result.count);
  await prisma.$disconnect();
}
main().catch(console.error);
