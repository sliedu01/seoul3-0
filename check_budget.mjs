import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.budgetCategory.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: {
          children: true
        }
      }
    },
    orderBy: { order: 'asc' }
  });

  console.log(JSON.stringify(categories, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
