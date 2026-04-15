const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({ 
        where: { role: 'ADMIN', isApproved: true },
        take: 5 
    });
    console.log("Admin Users:", JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
