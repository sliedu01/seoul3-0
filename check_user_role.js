const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findFirst({
    where: { email: 'hrd_jjg@sliedu.com' }
  });
  console.log('User Role:', u.role);
  await prisma.$disconnect();
}
main().catch(console.error);
