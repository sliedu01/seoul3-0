const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBudgetData() {
  try {
    const expenditures = await prisma.expenditure.findMany({
      include: {
        category: true
      }
    });

    console.log(`Found ${expenditures.length} expenditures to check.`);

    for (const exp of expenditures) {
      let subDetail = exp.subDetailName || '';
      let purpose = exp.purpose || '';
      let changed = false;

      // 1. Handle dates in names: "앤드센터(3.21.)" -> "앤드센터"
      if (subDetail.includes('(') && subDetail.includes(')')) {
        const match = subDetail.match(/^(.*?)\((.*?)\)$/);
        if (match) {
          const baseName = match[1].trim();
          const detailStr = match[2].trim();
          
          if (baseName === '앤드센터') {
            purpose = `${detailStr} ${purpose}`.trim();
            subDetail = baseName;
            changed = true;
          }
        }
      }

      // 2. Handle vendors in subDetailName
      const vendors = ['에듀콤', 'SLI', '고려대학교산학협력단', '(주)휴레블랜', '더함께', '서울특별시도협지원센터'];
      if (vendors.some(v => subDetail.includes(v))) {
         purpose = `${subDetail} ${purpose}`.trim();
         // If it's under '진로캠퍼스', use '앤드센터' as a better subDetailName if it was just a vendor
         if (exp.category && exp.category.name.includes('진로캠퍼스')) {
           subDetail = '앤드센터';
         } else {
           subDetail = exp.category ? exp.category.name : '기타 상세';
         }
         changed = true;
      }

      if (changed) {
        await prisma.expenditure.update({
          where: { id: exp.id },
          data: {
            subDetailName: subDetail,
            purpose: purpose
          }
        });
        console.log(`Fixed Expenditure ${exp.id}: "${subDetail}" | "${purpose}"`);
      }
    }

    console.log('Data cleanup finished.');
  } catch (error) {
    console.error('Cleanup error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBudgetData();
