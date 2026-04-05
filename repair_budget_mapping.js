const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. 진로캠퍼스 (L2) 가 포함된 카테고리 ID 찾기
  const jinro = await prisma.budgetCategory.findFirst({
    where: { 
      name: { contains: '진로캠퍼스' },
      level: 2
    }
  });

  if (!jinro) {
    console.error("Error: '1. 진로캠퍼스' (L2) 카테고리를 찾을 수 없습니다.");
    return;
  }

  console.log(`Found Jinro Category ID: ${jinro.id}`);

  // 2. subDetailName 에 '앤드센터'가 포함된 모든 지출 내역 찾기
  const exps = await prisma.expenditure.findMany({
    where: {
      subDetailName: { contains: '앤드센터' }
    }
  });

  console.log(`Found ${exps.length} expenditures matching '앤드센터'.`);

  // 3. 해당 지출 내역들의 categoryId 를 진로캠퍼스로 업데이트
  const updated = await prisma.expenditure.updateMany({
    where: {
      subDetailName: { contains: '앤드센터' }
    },
    data: {
      categoryId: jinro.id
    }
  });

  console.log(`Successfully updated ${updated.count} expenditures.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
