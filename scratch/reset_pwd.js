const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function reset() {
  try {
    const hash = await bcrypt.hash('password123', 10);
    await prisma.user.update({
      where: { email: 'hrd_jjg@sliedu.com' },
      data: { password: hash }
    });
    console.log('Password reset successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

reset();
