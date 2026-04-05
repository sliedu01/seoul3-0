const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Directly simulate the logic or check the DB state
  const categories = await prisma.budgetCategory.findMany({
    where: { name: '사업비' },
    include: {
      children: {
        include: {
          expenditures: true,
          children: {
            include: { expenditures: true }
          }
        }
      }
    }
  });

  console.log("--- Category Aggregation Logic Validation ---");
  for (const l1 of categories) {
    console.log(`L1: ${l1.name}`);
    for (const l2 of l1.children) {
      let l2Used = 0;
      let l2Expected = 0;
      
      // Simulating the API logic
      const l3Map = {};
      l2.children.forEach(l3 => {
        l3Map[l3.name] = { budget: Number(l3.budgetAmount), used: BigInt(0), expected: BigInt(0) };
      });

      const processExp = (exp) => {
        const name = exp.subDetailName || '미지정';
        if (!l3Map[name]) l3Map[name] = { budget: 0, used: BigInt(0), expected: BigInt(0) };
        const amount = BigInt(exp.totalAmount || 0);
        if (exp.executionDate) l3Map[name].used += amount;
        else l3Map[name].expected += amount;
      };

      l2.expenditures.forEach(processExp);
      l2.children.forEach(l3 => l3.expenditures.forEach(processExp));

      Object.values(l3Map).forEach(item => {
        l2Used += Number(item.used);
        l2Expected += Number(item.expected);
      });

      console.log(`  L2: ${l2.name} | Used: ${l2Used.toLocaleString()} | Expected: ${l2Expected.toLocaleString()}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
