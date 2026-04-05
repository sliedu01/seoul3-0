import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const res = await fetch('http://localhost:3000/api/budget/categories');
  const categories = await res.json();
  
  console.log("--- L1 Budget Summary ---");
  categories.forEach(l1 => {
    console.log(`${l1.name}: ${l1.budgetAmount.toLocaleString()}원 (isRate: ${l1.isRate}, rate: ${l1.ratePercent}%)`);
  });
  
  const gBudget = categories.reduce((s, c) => s + Number(c.budgetAmount), 0);
  console.log(`\nGrand Total: ${gBudget.toLocaleString()}원`);
}

main().catch(async (e) => {
  // If fetch fails, try dev environment directly
  const { GET } = await import('./src/app/api/budget/categories/route.ts');
  const response = await GET();
  const categories = await response.json();
  
  console.log("--- L1 Budget Summary (Direct Import) ---");
  categories.forEach(l1 => {
    console.log(`${l1.name}: ${Number(l1.budgetAmount).toLocaleString()}원 (isRate: ${l1.isRate}, rate: ${l1.ratePercent}%)`);
  });

  const gBudget = categories.reduce((s, c) => s + Number(c.budgetAmount), 0);
  console.log(`\nGrand Total: ${gBudget.toLocaleString()}원`);
}).finally(() => prisma.$disconnect());
