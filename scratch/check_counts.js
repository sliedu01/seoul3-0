const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.surveyResponse.count({
    where: { session: { program: { name: '진로캠퍼스' } } }
  });
  console.log('Survey Responses for 진로캠퍼스:', count);
  
  const sessions = await prisma.programSession.findMany({
    where: { program: { name: '진로캠퍼스' } },
    include: { _count: { select: { responses: true } } }
  });
  console.log('Sessions:', JSON.stringify(sessions.map(s => ({ id: s.id, date: s.date, count: s._count.responses })), null, 2));

  process.exit();
}
check();
