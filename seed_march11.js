const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  // Find "미래인재 진로캠퍼스" program
  let program = await prisma.program.findFirst({
    where: { name: "미래인재 진로캠퍼스" }
  });
  if (!program) {
    program = await prisma.program.create({
      data: {
        name: "미래인재 진로캠퍼스",
        description: "미래 역량 강화 프로그램",
        coreGoals: "디지털 리터러시"
      }
    });
  }

  // Find partner
  let partner = await prisma.partner.findFirst({
    where: { name: "서울교육지원센터" }
  });
  if (!partner) {
    partner = await prisma.partner.create({
      data: {
        name: "서울교육지원센터",
        contactName: "홍길동",
        contactPhone: "010-1234-5678"
      }
    });
  }

  const date = new Date("2026-03-11T00:00:00Z");
  const startTime = new Date("2026-03-11T09:00:00Z");
  const endTime = new Date("2026-03-11T12:00:00Z");

  const session = await prisma.programSession.create({
    data: {
      programId: program.id,
      partnerId: partner.id,
      sessionNumber: 1, // Will be re-calculated
      date: date,
      startTime: startTime,
      endTime: endTime,
      courseName: "디지털 기초 역량",
      instructorName: "이디지털 강사",
      capacity: 30,
      participantCount: 20,
      completerCount: 18
    }
  });

  // Re-calculate session numbers for this program
  const allSessions = await prisma.programSession.findMany({
    where: { programId: program.id },
    orderBy: [
      { date: "asc" },
      { startTime: "asc" }
    ]
  });

  for (let i = 0; i < allSessions.length; i++) {
    await prisma.programSession.update({
      where: { id: allSessions[i].id },
      data: { sessionNumber: i + 1 }
    });
  }

  console.log("Seed finished: Added March 11 session.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
