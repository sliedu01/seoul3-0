import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// BigInt JSON 직렬화 패치
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export async function PATCH(req: Request, context: any) {
  try {
    const { id } = context.params;
    const data = await req.json();

    let totalAmount = data.totalAmount !== undefined ? BigInt(data.totalAmount) : undefined;
    let supplyAmount = data.supplyAmount !== undefined ? BigInt(data.supplyAmount) : undefined;
    let taxAmount = data.taxAmount !== undefined ? BigInt(data.taxAmount) : undefined;

    // 전체 금액만 넘어왔고 자동 계산 트리거 시
    if (totalAmount !== undefined && supplyAmount === undefined && taxAmount === undefined) {
      supplyAmount = (totalAmount / BigInt(11)) * BigInt(10);
      taxAmount = totalAmount - supplyAmount;
    }

    const updated = await prisma.expenditure.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        executionDate: data.executionDate === null ? null : (data.executionDate ? new Date(data.executionDate) : undefined),
        purpose: data.purpose,
        supplyAmount,
        taxAmount,
        totalAmount,
        evidenceType: data.evidenceType,
        evidenceFileId: data.evidenceFileId,
        evidenceFileName: data.evidenceFileName,
        originalFileName: data.originalFileName,
        memo: data.memo,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update Expenditure Error:', error);
    return NextResponse.json({ error: 'Failed to update expenditure' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    const { id } = context.params;
    await prisma.expenditure.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Expenditure Error:', error);
    return NextResponse.json({ error: 'Failed to delete expenditure' }, { status: 500 });
  }
}
