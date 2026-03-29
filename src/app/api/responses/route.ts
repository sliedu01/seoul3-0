import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { sessionId, targetLevel, studentName, responses } = await req.json();

    if (!sessionId || !responses || !Array.isArray(responses)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Session and Template Verification
    const session = await prisma.programSession.findUnique({
      where: { id: sessionId },
      include: { program: true }
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Map targetLevel to researchTarget enum
    const targetMap: Record<string, string> = {
      elementary: "ELEMENTARY", middle: "MIDDLE", high: "HIGH", university: "UNIVERSITY"
    };

    // 2. Create SurveyResponse & Answers in Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Response
      const surveyResponse = await tx.surveyResponse.create({
        data: {
          programSessionId: sessionId,
          respondentId: studentName || `Student_${Math.random().toString(36).substr(2, 6)}`,
          researchTarget: targetMap[targetLevel] || targetLevel || "OTHER",
          type: "SATISFACTION_COMPETENCY", // Combined type
          answers: {
            create: responses.map((ans: any) => {
              let finalScore = ans.score; // For satisfaction questions

              // For competency questions, calculate scores: MIN(5, MAX(1, pre + change))
              if (ans.preScore !== undefined && ans.postChange !== undefined) {
                finalScore = Math.min(5, Math.max(1, Number(ans.preScore) + Number(ans.postChange)));
              }

              return {
                questionId: ans.questionId,
                preScore: ans.preScore !== undefined ? Number(ans.preScore) : null,
                postChange: ans.postChange !== undefined ? Number(ans.postChange) : null,
                score: finalScore !== undefined ? Number(finalScore) : null,
                text: ans.textValue || null
              };
            })
          }
        }
      });

      return surveyResponse;
    });

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error("Survey submission error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
