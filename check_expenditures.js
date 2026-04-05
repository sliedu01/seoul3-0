const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const exps = await prisma.expenditure.findMany({
    where: { subDetailName: { contains: '앤드센터' } },
    include: {
      category: {
        include: {
          parent: {
            include: {
              parent: true
            }
          }
        }
      }
    }
  });

  console.log("--- expenditures with '앤드센터' ---");
  for (const exp of exps) {
    console.log(`ID: ${exp.id}`);
    console.log(`SubDetailName: ${exp.subDetailName}`);
    console.log(`CategoryID: ${exp.categoryId}`);
    if (exp.category) {
      console.log(`CategoryName: ${exp.category.name} (level: ${exp.category.level})`);
      if (exp.category.parent) {
        console.log(`ParentName: ${exp.category.parent.name}`);
      }
    } else {
      console.log("Category: NULL");
    }
    console.log("-----------------------");
  }

  const jinro = await prisma.budgetCategory.findFirst({
    where: { name: { contains: '진로캠퍼스' } }
  });
  if (jinro) {
    console.log(`Jinro Campus Category Info: ID: ${jinro.id}, Name: ${jinro.name}, Level: ${jinro.level}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
