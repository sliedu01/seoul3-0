const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const answers = await prisma.answer.findMany({
    where: { score: { not: null } },
    select: { score: true }
  });

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  answers.forEach(a => { if(counts[a.score] !== undefined) counts[a.score]++; });

  const total = answers.length;
  console.log(`Total scored answers: ${total}`);
  console.log(`Positive (4-5): ${((counts[4] + counts[5])/total*100).toFixed(1)}%`);
  console.log(`Neutral (3): ${(counts[3]/total*100).toFixed(1)}%`);
  console.log(`Negative (1-2): ${((counts[1] + counts[2])/total*100).toFixed(1)}%`);
  
  const programs = await prisma.program.findMany({ select: { name: true, description: true } });
  console.log('\nSample Program Contexts:');
  programs.slice(0, 3).forEach(p => console.log(`- ${p.name}: ${p.description}`));
}

main().finally(() => prisma.$disconnect());
