const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- Starting Budget Migration (L3 -> L2) ---");

  // 1. L1 (사업비, 인건비 등) 조회
  const l1s = await prisma.budgetCategory.findMany({
    where: { level: 1 },
    include: { children: { include: { children: true } } }
  });

  for (const l1 of l1s) {
    for (const l2 of l1.children) {
      if (l2.children.length > 0) {
        console.log(`Elevating children of L2: ${l2.name}`);
        for (const l3 of l2.children) {
          console.log(`  Elevating L3: ${l3.name} to L2 under ${l1.name}`);
          await prisma.budgetCategory.update({
            where: { id: l3.id },
            data: {
              level: 2,
              parentId: l1.id
            }
          });
        }
        
        // 중간 L2 (직접사업비 등) 삭제 (하위가 모두 이동되었으므로)
        // 단, 집행내역이 L2에 직접 달려있으면 그것도 이동시켜야 함
        const exps = await prisma.expenditure.findMany({ where: { categoryId: l2.id } });
        if (exps.length > 0) {
           console.log(`  Moving expenditures from redundant L2: ${l2.name} to L1 temporarily (or handle mapping)`);
           // 사실 사용자가 원하는 것은 L1하위에 L2(진로캠퍼스)가 바로 있는 것이므로 
           // 이 지출들이 어디로 가야할지는 모호함. 일단 보류하거나 첫번째 자식으로 이동?
           // 안전하게 L1본인에게 일단 연결 (나중에 사용자가 수정 가능)
           await prisma.expenditure.updateMany({
             where: { categoryId: l2.id },
             data: { categoryId: l1.id }
           });
        }

        console.log(`  Deleting redundant intermediate L2: ${l2.name}`);
        await prisma.budgetCategory.delete({ where: { id: l2.id } });
      }
    }
  }

  console.log("--- Budget Migration Complete ---");
}

main().catch(console.error).finally(() => prisma.$disconnect());
