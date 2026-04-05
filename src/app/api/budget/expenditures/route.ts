import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// BigInt JSON 직렬화 지원을 위한 패치
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');

    const expenditures = await prisma.expenditure.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        category: {
          include: { parent: true }
        }
      },
      orderBy: [
        { executionDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(expenditures);
  } catch (error) {
    console.error('Fetch Expenditures Error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenditures' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // 단일 등록 또는 배열(엑셀 일괄 등록) 지원
    const isArray = Array.isArray(data);
    const items = isArray ? data : [data];

    const processedData = items.map(item => {
      // 부가세 자동 분리: 공급가, 부가세가 비어있고 totalAmount만 넘어온 경우
      let totalAmount = BigInt(item.totalAmount || 0);
      let supplyAmount = BigInt(item.supplyAmount || 0);
      let taxAmount = BigInt(item.taxAmount || 0);

      if (totalAmount > BigInt(0) && supplyAmount === BigInt(0) && taxAmount === BigInt(0)) {
          supplyAmount = (totalAmount / BigInt(11)) * BigInt(10);
          taxAmount = totalAmount - supplyAmount;
      } else if (totalAmount === BigInt(0) && (supplyAmount > BigInt(0) || taxAmount > BigInt(0))) {
          totalAmount = supplyAmount + taxAmount;
      }

      return {
        categoryId: item.categoryId,
        executionDate: item.executionDate ? new Date(item.executionDate) : null,
        purpose: item.purpose,
        supplyAmount,
        taxAmount,
        totalAmount,
        evidenceType: item.evidenceType,
        evidenceFileId: item.evidenceFileId,
        evidenceFileName: item.evidenceFileName,
        originalFileName: item.originalFileName,
        memo: item.memo
      };
    });

    if (isArray) {
       const created = await prisma.expenditure.createMany({
         data: processedData,
         skipDuplicates: true
       });
       return NextResponse.json({ count: created.count });
    } else {
       const created = await prisma.expenditure.create({
         data: processedData[0]
       });
       return NextResponse.json(created);
    }

  } catch (error) {
    console.error('Create Expenditure Error:', error);
    return NextResponse.json({ error: 'Failed to create expenditure' }, { status: 500 });
  }
}
