import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // 1. 산출내역서 3단계 조회
    const categories = await prisma.budgetCategory.findMany({
      include: {
        children: {
          include: { 
            children: {
              include: { expenditures: true },
              orderBy: { order: 'asc' }
            },
            expenditures: true 
          },
          orderBy: { order: 'asc' }
        },
        expenditures: true
      },
      orderBy: { order: 'asc' },
      where: { parentId: null }
    });

    // 2. 집행명세서 조회
    const expenditures = await prisma.expenditure.findMany({
      include: { 
        category: { 
          include: { 
            parent: {
              include: { parent: true }
            }
          } 
        } 
      },
      orderBy: [
        { executionDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const wb = XLSX.utils.book_new();

    // =============== 시트 1: 현황 총괄 (산출내역서) ===============
    const summaryData: any[][] = [
      ['비목(L1)', '관리세목(L2)', '세세목(L3)', '배정예산', '사용액', '사용예정액', '잔액', '사용률(%)']
    ];

    categories.forEach(l1 => {
      let l1Used = 0, l1Expected = 0;
      
      l1.children.forEach(l2 => {
        let l2Used = 0, l2Expected = 0;

        l2.children.forEach(l3 => {
          let l3Used = 0, l3Expected = 0;
          l3.expenditures.forEach(exp => {
            if (exp.executionDate) l3Used += Number(exp.totalAmount);
            else l3Expected += Number(exp.totalAmount);
          });

          l2Used += l3Used;
          l2Expected += l3Expected;

          const l3Budget = Number(l3.budgetAmount);
          const l3UsageRate = l3Budget > 0 ? ((l3Used + l3Expected) / l3Budget * 100).toFixed(2) : '0.00';

          summaryData.push([
            l1.name,
            l2.name,
            l3.name,
            l3Budget,
            l3Used,
            l3Expected,
            l3Budget - l3Used - l3Expected,
            l3UsageRate
          ]);
        });

        l1Used += l2Used;
        l1Expected += l2Expected;

        const l2Budget = l2.children.reduce((acc, c) => acc + Number(c.budgetAmount), 0) + Number(l2.budgetAmount);
        const l2UsageRate = l2Budget > 0 ? ((l2Used + l2Expected) / l2Budget * 100).toFixed(2) : '0.00';
        
        summaryData.push([
          '', 
          `[${l2.name} 소계]`, 
          '', 
          l2Budget, 
          l2Used, 
          l2Expected, 
          l2Budget - l2Used - l2Expected, 
          l2UsageRate
        ]);
      });

      const l1Budget = l1.isRate ? Number(l1.budgetAmount) : l1.children.reduce((acc, c) => acc + c.children.reduce((acc2, c2) => acc2 + Number(c2.budgetAmount), 0) + Number(c.budgetAmount), 0) + Number(l1.budgetAmount);
      const l1UsageRate = l1Budget > 0 ? ((l1Used + l1Expected) / l1Budget * 100).toFixed(2) : '0.00';
      
      summaryData.push([
        `[${l1.name} 총계]`, 
        '', 
        '', 
        l1Budget, 
        l1Used, 
        l1Expected, 
        l1Budget - l1Used - l1Expected, 
        l1UsageRate
      ]);
      
      // 구분을 위한 빈 줄
      summaryData.push([]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, '산출내역 현황');

    // =============== 시트 2: 집행명세 상세 ===============
    const detailData: any[][] = [
      ['생성일', '집행일', '비목', '관리세목', '세세목', '집행용도', '공급가액', '부가세액', '전체금액(합계)', '증빙자료명', '고유파일명', '비고']
    ];

    expenditures.forEach(exp => {
      detailData.push([
        exp.createdAt.toLocaleDateString(),
        exp.executionDate ? exp.executionDate.toLocaleDateString() : '미정',
        exp.category?.parent?.parent?.name || '',
        exp.category?.parent?.name || '',
        exp.category?.name || '',
        exp.purpose || '',
        Number(exp.supplyAmount),
        Number(exp.taxAmount),
        Number(exp.totalAmount),
        exp.evidenceType || '',
        exp.evidenceFileName || '',
        exp.memo || ''
      ]);
    });

    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, detailSheet, '집행명세서');

    // 엑셀 바이너리 버퍼 생성
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="budget_report_3levels.xlsx"',
      },
    });

  } catch (error) {
    console.error('Export Excel Error:', error);
    return NextResponse.json({ error: 'Failed to export to Excel' }, { status: 500 });
  }
}

