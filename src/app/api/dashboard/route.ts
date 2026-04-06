import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    // KST 기준 오늘 날짜 계산 (UTC+9) — 서버 TZ와 무관하게 동작
    const kstMs = now.getTime() + (9 * 3600000);
    const kstDate = new Date(kstMs);
    const todayYear = kstDate.getUTCFullYear();
    const todayMonth = kstDate.getUTCMonth();
    const todayDay = kstDate.getUTCDate();
    const todayDow = kstDate.getUTCDay(); // 0=Sun, 1=Mon, ...

    // 이번주 월요일 (UTC midnight 기준) — DB 날짜가 UTC midnight으로 저장됨
    const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
    const thisMondayMs = Date.UTC(todayYear, todayMonth, todayDay + mondayOffset);

    // 각 주간 범위 계산 (월요일 00:00 UTC ~ 일요일 23:59:59.999 UTC)
    const makeWeekRange = (mondayMs: number) => ({
      start: new Date(mondayMs),
      end: new Date(mondayMs + 6 * 86400000 + 86400000 - 1) // 일요일 23:59:59.999
    });

    const twoWeeksAgoRange = makeWeekRange(thisMondayMs - 14 * 86400000);
    const lastWeekRange = makeWeekRange(thisMondayMs - 7 * 86400000);
    const thisWeekRange = makeWeekRange(thisMondayMs);
    const nextWeekRange = makeWeekRange(thisMondayMs + 7 * 86400000);

    const twoWeeksAgoMonday = twoWeeksAgoRange.start;
    const twoWeeksAgoSunday = twoWeeksAgoRange.end;
    const lastMonday = lastWeekRange.start;
    const lastSunday = lastWeekRange.end;
    const thisMonday = thisWeekRange.start;
    const thisSunday = thisWeekRange.end;
    const nextMonday = nextWeekRange.start;
    const nextSunday = nextWeekRange.end;

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
          date: { gte: start, lte: end }
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

    const fetchOtherSchedules = (start: Date, end: Date) => {
      return prisma.otherSchedule.findMany({
        where: {
          OR: [
            { startDate: { gte: start, lte: end } },
            { endDate: { gte: start, lte: end } },
            { AND: [ { startDate: { lte: start } }, { endDate: { gte: end } } ] }
          ]
        },
        orderBy: { startDate: "asc" }
      });
    };

    const [
      twoWeeksAgoSessions, lastWeekSessions, thisWeekSessions, nextWeekSessions, 
      twoWeeksAgoM, lastWeekM, thisWeekM, nextWeekM,
      twoWeeksAgoO, lastWeekO, thisWeekO, nextWeekO
    ] = await Promise.all([
      fetchSessions(twoWeeksAgoMonday, twoWeeksAgoSunday),
      fetchSessions(lastMonday, lastSunday),
      fetchSessions(thisMonday, thisSunday),
      fetchSessions(nextMonday, nextSunday),
      fetchMeetings(twoWeeksAgoMonday, twoWeeksAgoSunday),
      fetchMeetings(lastMonday, lastSunday),
      fetchMeetings(thisMonday, thisSunday),
      fetchMeetings(nextMonday, nextSunday),
      fetchOtherSchedules(twoWeeksAgoMonday, twoWeeksAgoSunday),
      fetchOtherSchedules(lastMonday, lastSunday),
      fetchOtherSchedules(thisMonday, thisSunday),
      fetchOtherSchedules(nextMonday, nextSunday)
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

    const formatOtherSchedules = (others: any[]) => others.map(s => ({
      ...s,
      id: `other-${s.id}`,
      date: s.startDate,
      sessionNumber: 1,
      capacity: 0,
      participantCount: 0,
      completerCount: 0,
      program: { order: 100, name: "기타 운영 일정" },
      partner: { name: s.title }
    }));

    const twoWeeksAgo = [...twoWeeksAgoSessions, ...formatMeetings(twoWeeksAgoM), ...formatOtherSchedules(twoWeeksAgoO)].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastWeek = [...lastWeekSessions, ...formatMeetings(lastWeekM), ...formatOtherSchedules(lastWeekO)].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const thisWeek = [...thisWeekSessions, ...formatMeetings(thisWeekM), ...formatOtherSchedules(thisWeekO)].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextWeek = [...nextWeekSessions, ...formatMeetings(nextWeekM), ...formatOtherSchedules(nextWeekO)].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
        twoWeeksAgo,
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

