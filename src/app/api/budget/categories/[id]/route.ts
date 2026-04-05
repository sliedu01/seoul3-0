import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, budgetAmount } = body;

    const updated = await prisma.budgetCategory.update({
      where: { id },
      data: {
        name,
        budgetAmount: budgetAmount !== undefined ? Number(budgetAmount) : undefined,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Budget Category Update Error:', error);
    return NextResponse.json({ error: '서버 오류로 항목을 수정하지 못했습니다.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;

    // 연결된 집행 내역(Expenditure) 또는 하위 카테고리가 있는지 확인
    const category = await prisma.budgetCategory.findUnique({
      where: { id },
      include: {
        children: true, // 자식 카테고리
        expenditures: true, // 할당된 명세
      }
    });

    if (!category) {
      return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (category.children.length > 0) {
      return NextResponse.json({ error: '하위 항목이 존재하여 삭제할 수 없습니다. 하위 항목을 먼저 삭제해주세요.' }, { status: 400 });
    }

    if (category.expenditures.length > 0) {
      return NextResponse.json({ error: '해당 항목으로 등록된 집행 내역이 존재하여 삭제할 수 없습니다.' }, { status: 400 });
    }

    await prisma.budgetCategory.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Budget Category Delete Error:', error);
    return NextResponse.json({ error: '서버 오류로 항목을 삭제하지 못했습니다.' }, { status: 500 });
  }
}
