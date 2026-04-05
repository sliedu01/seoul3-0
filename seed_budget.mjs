import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting 3-Level Budget Seeding...");

  // 트랜잭션 오류를 막기 위해 기존 데이터 일괄 삭제
  await prisma.expenditure.deleteMany();
  await prisma.budgetCategory.deleteMany();

  // 1. Level 1 Categories (비목)
  const personnel = await prisma.budgetCategory.create({ data: { level: 1, name: "인건비", order: 1 } });
  const business = await prisma.budgetCategory.create({ data: { level: 1, name: "사업비", order: 2 } });
  const operation = await prisma.budgetCategory.create({ data: { level: 1, name: "운영비", order: 3 } });
  
  // 미분류 1단계 옵션 추가
  const unclassifiedL1 = await prisma.budgetCategory.create({ data: { level: 1, name: "미분류", order: 99 } });

  // 2. Level 2 Categories (관리세목)
  const pL2_1 = await prisma.budgetCategory.create({ data: { parentId: personnel.id, level: 2, name: "사업종사자", order: 1 } });
  const bL2_1 = await prisma.budgetCategory.create({ data: { parentId: business.id, level: 2, name: "직접사업비", order: 1 } });
  const oL2_1 = await prisma.budgetCategory.create({ data: { parentId: operation.id, level: 2, name: "기관운영비", order: 1 } });
  const unclassifiedL2 = await prisma.budgetCategory.create({ data: { parentId: unclassifiedL1.id, level: 2, name: "미분류 세목", order: 99 } });

  // 3. Level 3 Categories (세세목) - 인건비 하위
  await prisma.budgetCategory.createMany({
    data: [
      { parentId: pL2_1.id, level: 3, name: "사업관리자", budgetAmount: 28400000, order: 1 },
      { parentId: pL2_1.id, level: 3, name: "현장책임자", budgetAmount: 54000000, order: 2 },
      { parentId: pL2_1.id, level: 3, name: "운영 실무", budgetAmount: 128000000, order: 3 },
      { parentId: pL2_1.id, level: 3, name: "미분류", budgetAmount: 0, order: 99 },
    ]
  });

  // 3. Level 3 Categories (세세목) - 사업비 하위
  await prisma.budgetCategory.createMany({
    data: [
      { parentId: bL2_1.id, level: 3, name: "1. 진로캠퍼스", budgetAmount: 250000000, order: 1 },
      { parentId: bL2_1.id, level: 3, name: "2. STEM프리스쿨", budgetAmount: 80000000, order: 2 },
      { parentId: bL2_1.id, level: 3, name: "3. 조금느린아이", budgetAmount: 90000000, order: 3 },
      { parentId: bL2_1.id, level: 3, name: "4. 생성형AI 서비스도입·제공", budgetAmount: 100000000, order: 4 },
      { parentId: bL2_1.id, level: 3, name: "5. 진로·진학 AI 코칭", budgetAmount: 120000000, order: 5 },
      { parentId: bL2_1.id, level: 3, name: "6. AI 핵심 인재 양성", budgetAmount: 50000000, order: 6 },
      { parentId: bL2_1.id, level: 3, name: "7. 화상영어", budgetAmount: 150000000, order: 7 },
      { parentId: bL2_1.id, level: 3, name: "8. 영어캠프", budgetAmount: 310000000, order: 8 },
      { parentId: bL2_1.id, level: 3, name: "9. 금융,경제,사이버안전 특강 및 멘토단 운영", budgetAmount: 60000000, order: 9 },
      { parentId: bL2_1.id, level: 3, name: "10. 오프라인특강", budgetAmount: 200000000, order: 10 },
      { parentId: bL2_1.id, level: 3, name: "11. 커뮤니케이션 특강", budgetAmount: 30000000, order: 11 },
      { parentId: bL2_1.id, level: 3, name: "미분류", budgetAmount: 0, order: 99 },
    ]
  });

  // 3. Level 3 Categories (세세목) - 운영비 하위
  await prisma.budgetCategory.createMany({
    data: [
      { parentId: oL2_1.id, level: 3, name: "홍보비", budgetAmount: 24000000, order: 1 },
      { parentId: oL2_1.id, level: 3, name: "회의비 및 활동비", budgetAmount: 6000000, order: 2 },
      { parentId: oL2_1.id, level: 3, name: "안전관리비", budgetAmount: 5818800, order: 3 },
      { parentId: oL2_1.id, level: 3, name: "미분류", budgetAmount: 0, order: 99 },
    ]
  });

  // 3. 구조적 미분류 연결
  await prisma.budgetCategory.create({ data: { parentId: unclassifiedL2.id, level: 3, name: "미분류 상세", budgetAmount: 0, order: 99 } });

  // 4. 일반관리비 및 이윤 (% 자동 계산 설정) - 이들은 단일 항목(Level 1)으로 직결
  await prisma.budgetCategory.create({
    data: { level: 1, name: "일반관리비", order: 4, isRate: true, ratePercent: 6.00 }
  });

  await prisma.budgetCategory.create({
    data: { level: 1, name: "이윤", order: 5, isRate: true, ratePercent: 6.00 }
  });

  console.log("3-Level Budget Seeding Completed Successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
