import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. 산출내역서 조회
    const categories = await prisma.budgetCategory.findMany({
      include: {
        children: {
          include: { expenditures: true },
          orderBy: { order: 'asc' }
        },
        expenditures: true
      },
      orderBy: { order: 'asc' },
      where: { parentId: null }
    });

    // 2. 집행명세서 조회
    const expenditures = await prisma.expenditure.findMany({
      include: { category: { include: { parent: true } } },
      orderBy: [
        { executionDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const wb = XLSX.utils.book_new();

    // =============== 시트 1: 현황 총괄 (산출내역서) ===============
    const summaryData: any[][] = [
      ['구분(비목)', '항목(세세목)', '배정예산', '사용액', '사용예정액', '잔액', '사용률(%)']
    ];

    categories.forEach(parent => {
      let pUsed = 0, pExpected = 0;
      
      parent.children.forEach(child => {
        let cUsed = 0, cExpected = 0;
        child.expenditures.forEach(exp => {
          if (exp.executionDate) cUsed += Number(exp.totalAmount);
          else cExpected += Number(exp.totalAmount);
        });
        
        pUsed += cUsed;
        pExpected += cExpected;
        
        const cBudget = Number(child.budgetAmount);
        const cUsageRate = cBudget > 0 ? ((cUsed + cExpected) / cBudget * 100).toFixed(2) : '0.00';

        summaryData.push([
          parent.name,
          child.name,
          cBudget,
          cUsed,
          cExpected,
          cBudget - cUsed - cExpected,
          cUsageRate
        ]);
      });

      // 소계 출력
      const pBudget = Number(parent.budgetAmount) > 0 ? Number(parent.budgetAmount) : parent.children.reduce((acc, c) => acc + Number(c.budgetAmount), 0);
      const pUsageRate = pBudget > 0 ? ((pUsed + pExpected) / pBudget * 100).toFixed(2) : '0.00';
      
      summaryData.push([
        `[${parent.name} 소계]`, 
        '', 
        pBudget, 
        pUsed, 
        pExpected, 
        pBudget - pUsed - pExpected, 
        pUsageRate
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, '산출내역 현황');

    // =============== 시트 2: 집행명세 상세 ===============
    const detailData: any[][] = [
      ['생성일', '집행일', '비목', '세세목', '집행용도', '공급가액', '부가세액', '합계', '증빙자료명', '고유파일명', '비고']
    ];

    expenditures.forEach(exp => {
      detailData.push([
        exp.createdAt.toLocaleDateString(),
        exp.executionDate ? exp.executionDate.toLocaleDateString() : '미정',
        exp.category.parent?.name || exp.category.name,
        exp.category.name,
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
        'Content-Disposition': 'attachment; filename="budget_report.xlsx"',
      },
    });

  } catch (error) {
    console.error('Export Excel Error:', error);
    return NextResponse.json({ error: 'Failed to export to Excel' }, { status: 500 });
  }
}
