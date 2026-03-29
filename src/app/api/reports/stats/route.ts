import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");
    const partnerId = searchParams.get("partnerId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    
    if (programId && programId !== "all") {
      where.session = { ...where.session, programId };
    }
    
    if (partnerId && partnerId !== "all") {
      where.session = { ...where.session, partnerId };
    }

    if (startDate || endDate) {
      const sDate = startDate ? new Date(startDate) : new Date("2000-01-01");
      let eDate = endDate ? new Date(endDate) : new Date("2100-01-01");
      if (endDate) eDate.setHours(23, 59, 59, 999);
      
      where.session = {
        ...where.session,
        OR: [
          { date: { gte: sDate, lte: eDate } },
          { endTime: { gte: sDate, lte: eDate } },
          { AND: [ { date: { lte: sDate } }, { endTime: { gte: eDate } } ] }
        ]
      };
    }

    const responses = await prisma.surveyResponse.findMany({
      where,
      include: {
        answers: {
          include: { question: true }
        }
      }
    });

    if (responses.length === 0) {
      // Return empty stats if no data
      return NextResponse.json({
        meanPre: 0,
        meanPost: 0,
        meanDiff: 0,
        n: 0,
        chartData: []
      });
    }

    // Example logic: group by answer type (PRE vs POST)
    const preScores: number[] = [];
    const postScores: number[] = [];
    const categoryStats: Record<string, { preSum: number, preCount: number, postSum: number, postCount: number }> = {};

    responses.forEach(resp => {
      resp.answers.forEach(ans => {
        if (ans.score === null) return;
        
        const category = ans.question.category || "기타";
        if (!categoryStats[category]) {
          categoryStats[category] = { preSum: 0, preCount: 0, postSum: 0, postCount: 0 };
        }

        if (resp.type === "PRE") {
          preScores.push(ans.score);
          categoryStats[category].preSum += ans.score;
          categoryStats[category].preCount += 1;
        } else if (resp.type === "POST") {
          postScores.push(ans.score);
          categoryStats[category].postSum += ans.score;
          categoryStats[category].postCount += 1;
        }
      });
    });

    const calculateMean = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    
    const meanPre = calculateMean(preScores);
    const meanPost = calculateMean(postScores);
    
    const chartData = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      pre: stats.preCount > 0 ? stats.preSum / stats.preCount : 0,
      post: stats.postCount > 0 ? stats.postSum / stats.postCount : 0
    }));

    return NextResponse.json({
      meanPre,
      meanPost,
      meanDiff: meanPost - meanPre,
      n: responses.length,
      chartData
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
