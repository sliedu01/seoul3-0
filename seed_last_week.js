const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  // Find a program or create one
  let program = await prisma.program.findFirst({
    where: { name: "2026 청소년 진로캠프" }
  });
  if (!program) {
    program = await prisma.program.create({
      data: {
        name: "2026 청소년 진로캠프",
        description: "청소년들을 위한 진로 탐색 프로그램",
        coreGoals: "진로 역량 강화"
      }
    });
  }

  // Find a partner or create one
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

  // Add a session from last week (March 18, 2026)
  const lastWeekDate = new Date("2026-03-18T00:00:00Z");
  const startTime = new Date("2026-03-18T10:00:00Z");
  const endTime = new Date("2026-03-18T12:00:00Z");

  await prisma.programSession.create({
    data: {
      programId: program.id,
      partnerId: partner.id,
      sessionNumber: 1,
      date: lastWeekDate,
      startTime: startTime,
      endTime: endTime,
      courseName: "나만의 장점 발견하기",
      instructorName: "김진로 강사",
      capacity: 30,
      participantCount: 28,
      completerCount: 25
    }
  });

  console.log("Seed finished: Added a last week session.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
