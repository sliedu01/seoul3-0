const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const l3 = await prisma.budgetCategory.findMany({
    where: { level: 3 },
    select: { name: true, budgetAmount: true, parent: { select: { name: true } } }
  });
  console.log("--- L3 Categories in DB ---");
  l3.forEach(c => {
    console.log(`${c.parent?.name} -> ${c.name}: ${Number(c.budgetAmount).toLocaleString()}원`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
