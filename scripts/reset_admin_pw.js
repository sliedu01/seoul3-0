const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetPassword() {
  const email = 'hrd_jjg@sliedu.com';
  const hashedPassword = await bcrypt.hash('1234', 10);
  
  try {
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });
    console.log(`Password for ${email} reset to '1234' for testing.`);
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
