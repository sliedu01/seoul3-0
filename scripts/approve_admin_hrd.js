const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function approveAdmin() {
  const email = 'hrd_jjg@sliedu.com';
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`User with email ${email} not found.`);
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        role: 'ADMIN',
        isApproved: true
      }
    });

    console.log(`Successfully approved ${email} as ADMIN.`);
    console.log(updatedUser);
  } catch (error) {
    console.error('Error approving user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

approveAdmin();
