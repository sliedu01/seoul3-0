import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { questions } = await req.json(); // Array of questions from frontend

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: "Invalid questions format. Expected an array." }, { status: 400 });
    }

    // Transaction to replace all questions for this template
    await prisma.$transaction(async (tx) => {
      // 1. Delete existing questions
      await tx.question.deleteMany({ where: { templateId: id } });

      // 2. Create new questions
      for (const q of questions) {
        await tx.question.create({
          data: {
            templateId: id,
            category: q.category || "기본 구분",
            type: q.type || "MCQ",
            growthType: q.growthType || "NONE",
            content: q.content,
            order: q.order || 0
          }
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save questions" }, { status: 500 });
  }
}
