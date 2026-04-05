import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. 트리 구조 비목과 하위 집행명세서 동시 조회
    const categories = await prisma.budgetCategory.findMany({
      include: {
        children: {
          include: {
            expenditures: true
          },
          orderBy: { order: 'asc' }
        },
        expenditures: true // (혹시 최상위에 직접 연결된 집행이 있을 경우 대비)
      },
      orderBy: { order: 'asc' },
      where: { parentId: null } // 최상위 비목만 가져오면 자식도 딸려옴
    });

    // 2. 대시보드 통계를 위한 계산 (비목별 사용액, 사용예정액)
    const formattedCategories = categories.map(parent => {
      // 자식들 계산 정리
      const processedChildren = parent.children.map(child => {
        let totalUsed = BigInt(0); // 사용액 (확정)
        let totalExpected = BigInt(0); // 사용예정액 (미정)

        child.expenditures.forEach(exp => {
          if (exp.executionDate) {
            totalUsed += exp.totalAmount;
          } else {
            totalExpected += exp.totalAmount;
          }
        });

        // 사용률
        const totalAllocated = Number(child.budgetAmount);
        const usedAndExpected = Number(totalUsed + totalExpected);
        const usageRate = totalAllocated > 0 ? (usedAndExpected / totalAllocated) * 100 : 0;

        return {
          ...child,
          budgetAmount: Number(child.budgetAmount),
          totalUsed: Number(totalUsed),
          totalExpected: Number(totalExpected),
          balance: Number(child.budgetAmount - totalUsed - totalExpected),
          usageRate: parseFloat(usageRate.toFixed(2))
        };
      });

      // 부모 비목 레벨 합계 추산
      const parentBudget = parent.isRate 
          ? Number(parent.budgetAmount) // 일반관리비 등은 일단 고정값으로 두고 나중에 퍼센트 적용
          : processedChildren.reduce((sum, child) => sum + child.budgetAmount, 0) + Number(parent.budgetAmount);
          
      const parentUsed = processedChildren.reduce((sum, child) => sum + child.totalUsed, 0);
      const parentExpected = processedChildren.reduce((sum, child) => sum + child.totalExpected, 0);
      const parentUsageRate = parentBudget > 0 ? ((parentUsed + parentExpected) / parentBudget) * 100 : 0;

      return {
        ...parent,
        budgetAmount: parentBudget,
        totalUsed: parentUsed,
        totalExpected: parentExpected,
        balance: parentBudget - parentUsed - parentExpected,
        usageRate: parseFloat(parentUsageRate.toFixed(2)),
        children: processedChildren
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
    // 비목/세세목 신규 등록/수정
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
    console.error('Budget Category Modify Error:', error);
    return NextResponse.json({ error: 'Failed to modify budget category' }, { status: 500 });
  }
}
