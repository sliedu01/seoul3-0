import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch sessions related to this partner
    const sessions = await prisma.programSession.findMany({
      where: { partnerId: id },
      include: {
        responses: {
          include: {
            answers: true
          }
        }
      }
    });

    if (sessions.length === 0) {
      return NextResponse.json({
        sessionCount: 0,
        avgSatisfaction: 0,
        avgDelta: 0,
        totalResponses: 0
      });
    }

    let satSum = 0;
    let satCount = 0;
    let preSum = 0;
    let preCount = 0;
    let postSum = 0;
    let postCount = 0;
    let totalResponses = 0;

    sessions.forEach(session => {
      totalResponses += session.responses.length;
      session.responses.forEach(resp => {
        resp.answers.forEach(ans => {
          if (ans.score === null) return;

          if (resp.type === "SATISFACTION") {
            satSum += ans.score;
            satCount++;
          } else if (resp.type === "PRE") {
            preSum += ans.score;
            preCount++;
          } else if (resp.type === "POST") {
            postSum += ans.score;
            postCount++;
          }
        });
      });
    });

    const avgSatisfaction = satCount > 0 ? satSum / satCount : 0;
    const avgPre = preCount > 0 ? preSum / preCount : 0;
    const avgPost = postCount > 0 ? postSum / postCount : 0;
    const avgDelta = avgPre > 0 ? ((avgPost - avgPre) / avgPre) * 100 : 0;

    return NextResponse.json({
      sessionCount: sessions.length,
      avgSatisfaction,
      avgDelta,
      totalResponses
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch partner stats" }, { status: 500 });
  }
}
