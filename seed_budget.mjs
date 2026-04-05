import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Budget Seeding...");

  // Delete existing categories to start fresh for seeding
  await prisma.budgetCategory.deleteMany();

  // 1. Level 1 Categories (비목)
  const personnel = await prisma.budgetCategory.create({
    data: { level: 1, name: "인건비", order: 1 }
  });
  
  const business = await prisma.budgetCategory.create({
    data: { level: 1, name: "사업비", order: 2 }
  });

  const operation = await prisma.budgetCategory.create({
    data: { level: 1, name: "운영비", order: 3 }
  });

  // 2. Level 2 - 인건비 세세목
  await prisma.budgetCategory.createMany({
    data: [
      { parentId: personnel.id, level: 3, name: "사업관리자", budgetAmount: 28400000, order: 1 },
      { parentId: personnel.id, level: 3, name: "현장책임자", budgetAmount: 54000000, order: 2 },
      { parentId: personnel.id, level: 3, name: "운영 실무", budgetAmount: 128000000, order: 3 },
    ]
  });

  // 3. Level 2 - 사업비 세세목
  await prisma.budgetCategory.createMany({
    data: [
      { parentId: business.id, level: 3, name: "1. 진로캠퍼스", budgetAmount: 250000000, order: 1 },
      { parentId: business.id, level: 3, name: "2. STEM프리스쿨", budgetAmount: 80000000, order: 2 },
      { parentId: business.id, level: 3, name: "3. 조금느린아이", budgetAmount: 90000000, order: 3 },
      { parentId: business.id, level: 3, name: "4. 생성형AI 서비스도입·제공", budgetAmount: 100000000, order: 4 },
      { parentId: business.id, level: 3, name: "5. 진로·진학 AI 코칭", budgetAmount: 120000000, order: 5 },
      { parentId: business.id, level: 3, name: "6. AI 핵심 인재 양성", budgetAmount: 50000000, order: 6 },
      { parentId: business.id, level: 3, name: "7. 화상영어", budgetAmount: 150000000, order: 7 },
      { parentId: business.id, level: 3, name: "8. 영어캠프", budgetAmount: 310000000, order: 8 },
      { parentId: business.id, level: 3, name: "9. 금융,경제,사이버안전 특강 및 멘토단 운영", budgetAmount: 60000000, order: 9 },
      { parentId: business.id, level: 3, name: "10. 오프라인특강", budgetAmount: 200000000, order: 10 },
      { parentId: business.id, level: 3, name: "11. 커뮤니케이션 특강", budgetAmount: 30000000, order: 11 },
    ]
  });

  // 4. Level 2 - 운영비 세세목
  await prisma.budgetCategory.createMany({
    data: [
      { parentId: operation.id, level: 3, name: "홍보비", budgetAmount: 24000000, order: 1 },
      { parentId: operation.id, level: 3, name: "회의비 및 활동비", budgetAmount: 6000000, order: 2 },
      { parentId: operation.id, level: 3, name: "안전관리비", budgetAmount: 5818800, order: 3 },
    ]
  });

  // 5. 일반관리비 및 이윤 (% 자동 계산 설정)
  await prisma.budgetCategory.create({
    data: { 
      level: 1, 
      name: "일반관리비", 
      order: 4,
      isRate: true,
      ratePercent: 6.00
    }
  });

  await prisma.budgetCategory.create({
    data: { 
      level: 1, 
      name: "이윤", 
      order: 5,
      isRate: true,
      ratePercent: 6.00
    }
  });

  console.log("Budget Seeding Completed Successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
