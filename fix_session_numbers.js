const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const programs = await prisma.program.findMany();
  
  for (const program of programs) {
    console.log(`Renumbering sessions for program: ${program.name}`);
    const sessions = await prisma.programSession.findMany({
      where: { programId: program.id },
      orderBy: [
        { date: "asc" },
        { startTime: "asc" }
      ]
    });

    for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
      await prisma.programSession.update({
        where: { id: s.id },
        data: { sessionNumber: i + 1 }
      });
      console.log(`  Session ${s.id}: ${s.date.toISOString()} -> ${i + 1}회차`);
    }
  }

  console.log("Fix finished: All session numbers corrected.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
