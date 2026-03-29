const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();
async function run() {
  const pc = await prisma.program.count();
  const ps = await prisma.programSession.count();
  console.log('Program Count:', pc);
  console.log('Session Count:', ps);
  const programs = await prisma.program.findMany();
  console.log('Programs:', JSON.stringify(programs, null, 2));
}
run();
