const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

const newPrograms = [
  "진로캠퍼스",
  "STEM프리스쿨",
  "조금느린아이",
  "생성형 AI 서비스 도입·제공",
  "진로·진학 AI코칭",
  "AI핵심 인재 양성",
  "화상영어",
  "영어캠프",
  "금융․경제․사이버안전 특강 및 멘토단 운영",
  "오프라인특강",
  "커뮤니케이션 특강"
];

async function main() {
  const existingPrograms = await prisma.program.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${existingPrograms.length} existing programs.`);

  for (let i = 0; i < newPrograms.length; i++) {
    if (existingPrograms[i]) {
      await prisma.program.update({
        where: { id: existingPrograms[i].id },
        data: { 
          name: newPrograms[i],
          order: i 
        }
      });
      console.log(`Updated Program ${i + 1}: ${newPrograms[i]} (order: ${i})`);
    } else {
      await prisma.program.create({
        data: { 
          name: newPrograms[i],
          order: i 
        }
      });
      console.log(`Created Program ${i + 1}: ${newPrograms[i]} (order: ${i})`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
