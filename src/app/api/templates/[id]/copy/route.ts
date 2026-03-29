import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch original template with questions
    const original = await prisma.questionTemplate.findUnique({
      where: { id },
      include: { questions: true }
    });

    if (!original) {
      return NextResponse.json({ error: "원본 템플릿을 찾을 수 없습니다." }, { status: 404 });
    }

    // 2. Clone in a transaction
    const clone = await prisma.$transaction(async (tx) => {
      // Create new template
      const newTemplate = await tx.questionTemplate.create({
        data: {
          name: `[복사] ${original.name}`,
          type: original.type,
          subType: original.subType,
          scope: original.scope,
          description: original.description,
          googleFormUrl: original.googleFormUrl,
          programId: original.programId,
        }
      });

      // Create cloned questions
      if (original.questions.length > 0) {
        await tx.question.createMany({
          data: original.questions.map(q => ({
            templateId: newTemplate.id,
            category: q.category,
            type: q.type,
            growthType: q.growthType,
            content: q.content,
            order: q.order
          }))
        });
      }

      return newTemplate;
    });

    return NextResponse.json(clone);
  } catch (error) {
    console.error("Failed to copy template:", error);
    return NextResponse.json({ error: "템플릿 복사 중 오류가 발생했습니다." }, { status: 500 });
  }
}
