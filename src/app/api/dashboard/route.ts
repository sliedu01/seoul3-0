import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate Week ranges (Monday to Sunday)
    const getMonday = (d: Date) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff)).setHours(0, 0, 0, 0);
    };

    const thisMonday = new Date(getMonday(new Date(today)));
    const thisSunday = new Date(thisMonday);
    thisSunday.setDate(thisMonday.getDate() + 6);
    thisSunday.setHours(23, 59, 59, 999);

    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);

    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(thisMonday.getDate() + 7);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextSunday.setHours(23, 59, 59, 999);

    // 1. Stats
    const programCount = await prisma.program.count();
    const partnerCount = await prisma.partner.count();

    // Fetch all relevant answers and questions for logic-based aggregation
    const allAnswers = await prisma.answer.findMany({
      include: { question: true }
    });

    const isSat = (q: any) => q.growthType === 'NONE' || q.category?.includes('만족') || q.content?.includes('만족');
    const isMat = (q: any) => (q.growthType === 'CHANGE' || q.growthType === 'PRE_POST') && !isSat(q);

    // Average Satisfaction
    const satAnswers = allAnswers.filter(a => a.question && isSat(a.question) && a.score !== null);
    const avgSatisfaction = satAnswers.length > 0 
      ? (satAnswers.reduce((acc, curr) => acc + (curr.score || 0), 0) / satAnswers.length).toFixed(1)
      : "0.0";

    // Growth Metrics
    let perceivedGrowth = 0;
    let netGrowth = 0;

    const responses = await prisma.surveyResponse.findMany({
      include: {
        answers: {
          include: { question: true }
        }
      }
    });

    if (responses.length > 0) {
      const allMatAnswers = responses.flatMap(r => r.answers).filter(a => a.question && isMat(a.question) && a.preScore !== null);
      const totalMatCount = allMatAnswers.length;

      if (totalMatCount > 0) {
        const preSum = allMatAnswers.reduce((acc, curr) => acc + (curr.preScore || 0), 0);
        const postSum = allMatAnswers.reduce((acc, curr) => {
          let post = (curr.question?.growthType === 'CHANGE') ? ((curr.preScore || 0) + (curr.postChange || 0)) : (curr.score || 0);
          return acc + Math.min(5, Math.max(1, post));
        }, 0);
        
        // 1. 학습 인지 변화도: (사후 - 사전) / 전체 척도(5점) * 100
        perceivedGrowth = ((postSum - preSum) / (totalMatCount * 5)) * 100;
        
        // 2. 역량 도달률: 사후 / 전체 척도(5점) * 100
        netGrowth = (postSum / (totalMatCount * 5)) * 100;
      }
    }

    // 2. Schedules
    const fetchSessions = (start: Date, end: Date) => {
      return prisma.programSession.findMany({
        where: {
          OR: [
            { date: { gte: start, lte: end } },
            { endTime: { gte: start, lte: end } },
            { 
               AND: [
                 { date: { lte: start } },
                 { endTime: { gte: end } }
               ]
            }
          ]
        },
        include: {
          program: true,
          partner: true
        },
        orderBy: { date: "asc" }
      });
    };

    const fetchMeetings = (start: Date, end: Date) => {
      return prisma.meetingMinute.findMany({
        where: { date: { gte: start, lte: end } },
        orderBy: { date: "asc" }
      });
    };

    const [lastWeekSessions, thisWeekSessions, nextWeekSessions, lastWeekM, thisWeekM, nextWeekM] = await Promise.all([
      fetchSessions(lastMonday, lastSunday),
      fetchSessions(thisMonday, thisSunday),
      fetchSessions(nextMonday, nextSunday),
      fetchMeetings(lastMonday, lastSunday),
      fetchMeetings(thisMonday, thisSunday),
      fetchMeetings(nextMonday, nextSunday)
    ]);

    const formatMeetings = (meetings: any[]) => meetings.map(m => ({
      ...m,
      id: `m-${m.id}`,
      sessionNumber: m.sequenceNumber || 1,
      capacity: 0,
      participantCount: 0,
      completerCount: 0,
      program: { order: 99, name: "회의" },
      partner: { name: m.title || "회의" }
    }));

    const lastWeek = [...lastWeekSessions, ...formatMeetings(lastWeekM)].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const thisWeek = [...thisWeekSessions, ...formatMeetings(thisWeekM)].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextWeek = [...nextWeekSessions, ...formatMeetings(nextWeekM)].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
      stats: {
        programCount,
        partnerCount,
        avgSatisfaction: parseFloat(avgSatisfaction as string),
        avgGrowth: parseFloat(netGrowth.toFixed(1)), // Keep for backward compatibility or use as main
        perceivedGrowth: parseFloat(perceivedGrowth.toFixed(1)),
        netGrowth: parseFloat(netGrowth.toFixed(1))
      },
      schedules: {
        lastWeek,
        thisWeek,
        nextWeek
      }
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch dashboard data", 
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}

