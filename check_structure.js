const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const l1s = await prisma.budgetCategory.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: {
          children: true
        }
      }
    }
  });

  console.log("--- Current Category Hierarchy ---");
  for (const l1 of l1s) {
    console.log(`L1: ${l1.name} (id: ${l1.id}, level: ${l1.level}, budget: ${l1.budgetAmount})`);
    for (const l2 of l1.children) {
      console.log(`  L2: ${l2.name} (id: ${l2.id}, level: ${l2.level}, budget: ${l2.budgetAmount})`);
      for (const l3 of l2.children) {
        console.log(`    L3: ${l3.name} (id: ${l3.id}, level: ${l3.level}, budget: ${l3.budgetAmount})`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
