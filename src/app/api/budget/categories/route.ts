import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // 2. 대시보드 통계를 위한 상향식(Bottom-up) 집계 계산 및 요율(%) 기반 비목 처리
    let accumulatedDirectBudget = 0;
    const formattedCategories = [];

    // 가중치(order) 순으로 정렬되어 있으므로 순차적으로 처리하며 예산 누적
    for (const l1 of categories) {
      const processedL2 = l1.children.map(l2 => {
        // 1. DB에 등록된 세세목(L3)들을 기본으로 맵핑
        const l3Map: { [key: string]: any } = {};
        
        l2.children.forEach(l3 => {
          l3Map[l3.name] = {
            id: l3.id,
            name: l3.name,
            level: 3,
            budgetAmount: Number(l3.budgetAmount),
            totalUsed: BigInt(0),
            totalExpected: BigInt(0),
            earliestDate: null as string | null,
            order: l3.order
          };
        });

        // 2. 집행 내역(Expenditures)을 세세목에 배분
        // L2에 직접 달린 집행 내역 처리
        l2.expenditures.forEach((exp: any) => {
          const name = (exp.subDetailName || '기타 상세').trim();
          if (!l3Map[name]) {
            l3Map[name] = { id: `virtual-l3-${l2.id}-${name}`, name: name, level: 3, budgetAmount: 0, totalUsed: BigInt(0), totalExpected: BigInt(0), earliestDate: null, order: 99 };
          }
          const amount = BigInt(exp.totalAmount || 0);
          if (exp.executionDate) {
            l3Map[name].totalUsed += amount;
            const dateStr = new Date(exp.executionDate).toISOString();
            if (!l3Map[name].earliestDate || dateStr < l3Map[name].earliestDate) {
              l3Map[name].earliestDate = dateStr;
            }
          } else l3Map[name].totalExpected += amount;
        });

        // L3 하위에 달린 집행 내역 처리
        l2.children.forEach(l3 => {
          l3.expenditures.forEach((exp: any) => {
             const name = (exp.subDetailName || l3.name || '기타 상세').trim();
             if (!l3Map[name]) {
               l3Map[name] = { id: `virtual-l3-${l2.id}-${name}`, name: name, level: 3, budgetAmount: 0, totalUsed: BigInt(0), totalExpected: BigInt(0), earliestDate: null, order: 99 };
             }
             const amount = BigInt(exp.totalAmount || 0);
             if (exp.executionDate) {
               l3Map[name].totalUsed += amount;
               const dateStr = new Date(exp.executionDate).toISOString();
               if (!l3Map[name].earliestDate || dateStr < l3Map[name].earliestDate) {
                 l3Map[name].earliestDate = dateStr;
               }
             } else l3Map[name].totalExpected += amount;
          });
        });

        // 3. 가공된 L3 리스트 생성
        const processedL3 = Object.values(l3Map).map(item => ({
          ...item,
          totalUsed: Number(item.totalUsed),
          totalExpected: Number(item.totalExpected),
          balance: item.budgetAmount - Number(item.totalUsed + item.totalExpected),
          usageRate: item.budgetAmount > 0 ? parseFloat(((Number(item.totalUsed + item.totalExpected) / item.budgetAmount) * 100).toFixed(2)) : 0
        })).sort((a, b) => {
          if (a.earliestDate && b.earliestDate) return a.earliestDate.localeCompare(b.earliestDate);
          if (a.earliestDate) return -1;
          if (b.earliestDate) return 1;
          return a.order - b.order;
        });

        // L2 레벨 집계 (L2 자체가 예산 보유 주체)
        const l2Budget = Number(l2.budgetAmount);
        const l2Used = processedL3.reduce((sum, c) => sum + c.totalUsed, 0);
        const l2Expected = processedL3.reduce((sum, c) => sum + c.totalExpected, 0);
        const l2Balance = l2Budget - l2Used - l2Expected;
        const l2UsageRate = l2Budget > 0 ? ((l2Used + l2Expected) / l2Budget) * 100 : 0;

        return {
          ...l2,
          budgetAmount: l2Budget,
          totalUsed: l2Used,
          totalExpected: l2Expected,
          balance: l2Balance,
          usageRate: parseFloat(l2UsageRate.toFixed(2)),
          children: processedL3
        };
      });

      // L1 (비목) 레벨 합계 및 요율 계산
      let l1Budget = 0;
      if (l1.isRate) {
        // 요율 기반 비목 (예: 일반관리비, 이윤)
        const rate = (l1.ratePercent || 0) / 100;
        l1Budget = Math.floor(accumulatedDirectBudget * rate);
      } else {
        // 일반 비목: 하위 관리세목 예산의 합계 + 본인 예산(있을 경우)
        const l2Sum = processedL2.reduce((sum, c) => sum + c.budgetAmount, 0);
        l1Budget = l2Sum + Number(l1.budgetAmount);
      }
      
      // 누적 예산 업데이트 (이후 요율 계산의 기준이 됨)
      accumulatedDirectBudget += l1Budget;

      const l1Used = processedL2.reduce((sum, c) => sum + c.totalUsed, 0);
      const l1Expected = processedL2.reduce((sum, c) => sum + c.totalExpected, 0);
      const l1UsageRate = l1Budget > 0 ? ((l1Used + l1Expected) / l1Budget) * 100 : 0;

      formattedCategories.push({
        ...l1,
        budgetAmount: l1Budget,
        totalUsed: l1Used,
        totalExpected: l1Expected,
        balance: l1Budget - l1Used - l1Expected,
        usageRate: parseFloat(l1UsageRate.toFixed(2)),
        children: processedL2
      });
    }

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


