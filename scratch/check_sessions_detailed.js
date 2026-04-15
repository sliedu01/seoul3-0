const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSessions() {
  try {
    const sessions = await prisma.programSession.findMany({
      where: {
        program: { name: '진로캠퍼스' },
        partner: { name: '시립노원청소년미래진로센터 앤드' }
      },
      include: {
        partner: true,
        _count: {
          select: { responses: true }
        }
      }
    });

    console.log("Sessions found:", JSON.stringify(sessions, null, 2));
    
    // Check total responses in the DB
    const totalResponses = await prisma.surveyResponse.count();
    console.log("Total survey responses in DB:", totalResponses);

    // If responses exist, check the distribution and date of the latest ones
    const recentResponses = await prisma.surveyResponse.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        session: true
      }
    });
    console.log("Recent Responses with Session Dates:", JSON.stringify(recentResponses.map(r => ({
      id: r.id,
      createdAt: r.createdAt,
      sessionDate: r.session.date,
      partnerId: r.session.partnerId
    })), null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessions();
