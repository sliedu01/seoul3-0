const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixData() {
  try {
    // 1. Update session dates for '진로캠퍼스'
    const result = await prisma.programSession.updateMany({
      where: {
        program: { name: '진로캠퍼스' },
        date: new Date('2026-05-02T00:00:00.000Z')
      },
      data: {
        date: new Date('2026-03-21T00:00:00.000Z'),
        startTime: new Date('2026-03-21T10:00:00.000Z'),
        endTime: new Date('2026-03-21T13:00:00.000Z')
      }
    });

    console.log(`Updated ${result.count} sessions from May 2 to March 21.`);

    // 2. Clear out the 1 junk response if it was on the wrong session/date
    const del = await prisma.surveyResponse.deleteMany({
        where: { createdAt: { gte: new Date(Date.now() - 1000 * 60 * 30) } } // Last 30 mins
    });
    console.log(`Deleted ${del.count} recent test responses to allow clean re-upload.`);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

fixData();
