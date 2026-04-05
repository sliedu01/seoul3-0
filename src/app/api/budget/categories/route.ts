import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// BigInt JSON 직렬화 지원을 위한 패치
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export async function GET() {
  try {
    // 1. 트리 구조 최상위(L1)부터 하위(L2), 세세목(L3) 및 그 안의 집행내역(expenditures)까지 3단계 동시 조회
    const categories = await prisma.budgetCategory.findMany({
      include: {
        children: {
          include: {
            children: {
              include: {
                expenditures: true
              },
              orderBy: { order: 'asc' }
            },
            expenditures: true // L2에 직접 달린 혹시 모를 집행 내역
          },
          orderBy: { order: 'asc' }
        },
        expenditures: true // L1에 직접 달린 경우
      },
      orderBy: { order: 'asc' },
      where: { parentId: null } // 최상위 비목
    });

    // 2. 대시보드 통계를 위한 상향식(Bottom-up) 집계 계산
    const formattedCategories = categories.map(l1 => {
      
      const processedL2 = l1.children.map(l2 => {
        const processedL3 = l2.children.map(l3 => {
          let totalUsed = BigInt(0); 
          let totalExpected = BigInt(0); 

          l3.expenditures.forEach(exp => {
            if (exp.executionDate) totalUsed += exp.totalAmount;
            else totalExpected += exp.totalAmount;
          });

          const allocated = Number(l3.budgetAmount);
          const usedAndExpected = Number(totalUsed + totalExpected);
          const usageRate = allocated > 0 ? (usedAndExpected / allocated) * 100 : 0;

          return {
            ...l3,
            budgetAmount: allocated,
            totalUsed: Number(totalUsed),
            totalExpected: Number(totalExpected),
            balance: allocated - Number(totalUsed) - Number(totalExpected),
            usageRate: parseFloat(usageRate.toFixed(2))
          };
        });

        // L2 (관리세목) 합계 계산
        const l2Budget = processedL3.reduce((sum, c) => sum + c.budgetAmount, 0) + Number(l2.budgetAmount);
        const l2Used = processedL3.reduce((sum, c) => sum + c.totalUsed, 0) + 
          l2.expenditures.reduce((sum, e) => sum + (e.executionDate ? Number(e.totalAmount) : 0), 0);
        const l2Expected = processedL3.reduce((sum, c) => sum + c.totalExpected, 0) +
          l2.expenditures.reduce((sum, e) => sum + (!e.executionDate ? Number(e.totalAmount) : 0), 0);
        const l2UsageRate = l2Budget > 0 ? ((l2Used + l2Expected) / l2Budget) * 100 : 0;

        return {
          ...l2,
          budgetAmount: l2Budget,
          totalUsed: l2Used,
          totalExpected: l2Expected,
          balance: l2Budget - l2Used - l2Expected,
          usageRate: parseFloat(l2UsageRate.toFixed(2)),
          children: processedL3
        };
      });

      // L1 (비목) 레벨 합계 추산
      const l2Sum = processedL2.reduce((sum, c) => sum + c.budgetAmount, 0);
      const l1Budget = (l1.isRate && l2Sum === 0) 
          ? Number(l1.budgetAmount) 
          : l2Sum + Number(l1.budgetAmount);
          
      const l1Used = processedL2.reduce((sum, c) => sum + c.totalUsed, 0) + 
        l1.expenditures.reduce((sum, e) => sum + (e.executionDate ? Number(e.totalAmount) : 0), 0);
      const l1Expected = processedL2.reduce((sum, c) => sum + c.totalExpected, 0) +
        l1.expenditures.reduce((sum, e) => sum + (!e.executionDate ? Number(e.totalAmount) : 0), 0);
      const l1UsageRate = l1Budget > 0 ? ((l1Used + l1Expected) / l1Budget) * 100 : 0;

      return {
        ...l1,
        budgetAmount: l1Budget,
        totalUsed: l1Used,
        totalExpected: l1Expected,
        balance: l1Budget - l1Used - l1Expected,
        usageRate: parseFloat(l1UsageRate.toFixed(2)),
        children: processedL2
      };
    });

    return NextResponse.json(formattedCategories);
  } catch (error) {
    console.error('Budget Category Fetch Error:', error);
    return NextResponse.json({ error: 'Failed to fetch budget categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (data.id) {
       const updated = await prisma.budgetCategory.update({
         where: { id: data.id },
         data: {
           name: data.name,
           budgetAmount: data.budgetAmount,
           order: data.order
         }
       });
       return NextResponse.json(updated);
    } else {
       const created = await prisma.budgetCategory.create({
         data: {
           name: data.name,
           budgetAmount: data.budgetAmount,
           level: data.level,
           parentId: data.parentId,
           order: data.order
         }
       });
       return NextResponse.json(created);
    }
  } catch (error) {
    console.error('Budget Category Create/Update Error:', error);
    return NextResponse.json({ error: 'Failed to create or modify budget category' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: '삭제할 항목 ID가 없습니다.' }, { status: 400 });
    }

    // 하위 항목이 있거나 집행 내역이 있는 항목이 있는지 사전 확인
    const categoriesWithChildrenOrExpenditures = await prisma.budgetCategory.findMany({
      where: {
        id: { in: ids },
        OR: [
          { children: { some: {} } },
          { expenditures: { some: {} } }
        ]
      },
      select: { name: true }
    });

    if (categoriesWithChildrenOrExpenditures.length > 0) {
      const names = categoriesWithChildrenOrExpenditures.map(c => c.name).join(', ');
      return NextResponse.json({ 
        error: `하위 항목이나 집행 내역이 포함된 항목(${names})이 있어 삭제할 수 없습니다. 개별적으로 먼저 정리해주세요.` 
      }, { status: 400 });
    }

    const { count } = await prisma.budgetCategory.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({ success: true, deletedCount: count });
  } catch (error) {
    console.error('Budget Category Bulk Delete Error:', error);
    return NextResponse.json({ error: '서버 오류로 항목을 삭제하지 못했습니다.' }, { status: 500 });
  }
}


