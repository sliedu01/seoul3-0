import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const programIds = searchParams.getAll("programId");
    const partnerIds = searchParams.getAll("partnerId");

    let whereClause: any = {};

    if (sessionId) {
      whereClause.programSessionId = sessionId;
    } else {
      whereClause.session = {};
      if (programIds.length > 0) {
        whereClause.session.programId = { in: programIds };
      }
      if (partnerIds.length > 0) {
        whereClause.session.partnerId = { in: partnerIds };
      }
      
      const hasDateFilter = startDate || endDate;
      if (hasDateFilter) {
        const sDate = startDate ? new Date(startDate) : new Date("2000-01-01");
        let eDate = endDate ? new Date(endDate) : new Date("2100-01-01");
        
        // 날짜 유효성 검사
        if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
            console.error("Invalid date provided:", { startDate, endDate });
        } else {
            if (endDate) eDate.setHours(23, 59, 59, 999);
            
            whereClause.session.OR = [
              { date: { gte: sDate, lte: eDate } },
              { endTime: { gte: sDate, lte: eDate } },
              { AND: [ { date: { lte: sDate } }, { endTime: { gte: eDate } } ] }
            ];
        }
      }
    }

    const isSessionEmpty = !whereClause.session || Object.keys(whereClause.session).length === 0;
    if (Object.keys(whereClause).length === 0 || (whereClause.session && isSessionEmpty)) {
      return NextResponse.json({ error: "Missing filter criteria" }, { status: 400 });
    }


    // 1. Fetch all responses for the selection with program info AND template type
    const responses = await prisma.surveyResponse.findMany({
      where: whereClause,
      include: {
        session: {
          include: { program: true }
        },
        template: true,
        answers: {
          include: { question: true }
        },
      }
    });

    if (responses.length === 0) {
      return NextResponse.json({ 
        overallStats: { totalRespondents: 0, perceivedGrowth: 0, netGrowth: 0 },
        programReports: []
      });
    }

    // 2. Identify Unique Programs
    const programMap = new Map<string, any[]>();
    responses.forEach(r => {
      const pid = r.session.programId;
      if (!programMap.has(pid)) programMap.set(pid, []);
      programMap.get(pid)?.push(r);
    });

    // Categorization: template.type 기반 분류 (1순위), 키워드는 fallback (2순위)
    const isSatByKeyword = (cat: string, content: string) => {
        const text = content || "";
        const c = cat || "";
        return c.includes("만족") || c.includes("satisfaction") || c.toLowerCase().includes("sat") ||
               text.includes("만족도") || text.includes("접근성") || text.includes("장소") || 
               text.includes("교통") || text.includes("환경") || text.includes("공간") ||
               text.includes("유익") || text.includes("구성") || text.includes("강사") || 
               text.includes("멘토") || text.includes("친절");
    };

    // template.type 기반 판별: response 단위로 만족도/성숙도 구분
    const isResponseSatisfaction = (r: any) => {
      // 1순위: template.type 필드 사용
      if (r.template?.type) {
        return r.template.type.includes('SATISFACTION');
      }
      // 2순위: response.type 필드 사용
      if (r.type && (r.type === 'SATISFACTION' || r.type === 'MATURITY')) {
        return r.type === 'SATISFACTION';
      }
      // 3순위(fallback): 키워드 기반 (legacy 데이터)
      return r.answers?.every((a: any) => isSatByKeyword(a.question?.category || "", a.question?.content || ""));
    };

    // 3. Process Each Program Individually
    const programReports = Array.from(programMap.entries()).map(([pid, pResponses]) => {
      const pProgram = pResponses[0].session.program;

      // response 단위로 만족도/성숙도 분리
      const maturityResponses = pResponses.filter((r: any) => !isResponseSatisfaction(r));
      const satisfactionResponses = pResponses.filter((r: any) => isResponseSatisfaction(r));

      // Group competency answers by respondent to calculate PER-PERSON growth
      const respondentGrowthStats = maturityResponses.map((r: any) => {
        const compAns = r.answers.filter((a: any) => a.question?.type !== 'ESSAY');
        if (compAns.length === 0) return null;

        let rPreSum = 0, rPostSum = 0, rCount = 0;
        let rImprovedCount = 0; // Number of questions where Post > Pre

        compAns.forEach((a: any) => {
          const pre = a.preScore || 0;
          let post = 0;
          if (a.question?.growthType === 'CHANGE') {
            post = pre > 0 ? pre + (a.postChange || 0) : 0;
          } else {
            post = a.score || 0;
          }
          post = Math.min(5, Math.max(1, post));
          
          if (post > pre) rImprovedCount++;
          
          rPreSum += pre;
          rPostSum += post;
          rCount++;
        });

        const rPreAvg = rPreSum / rCount;
        const rPostAvg = rPostSum / rCount;
        
        // 1. 학습 인지 변화도: (사후 평균 - 사전 평균) / 전체 척도(5점) * 100
        const perceivedRate = ((rPostAvg - rPreAvg) / 5) * 100;
        
        // 2. 역량 도달률: 사후 평균 / 전체 척도(5점) * 100
        const netGrowthRate = (rPostAvg / 5) * 100;

        // 3. 학습 목표 근접도: (사후 - 사전) / (5 - 사전) * 100
        let potentialGrowthRate = 0;
        if (rPreAvg >= 5) {
          potentialGrowthRate = rPostAvg >= 5 ? 100 : 0;
        } else {
          potentialGrowthRate = ((rPostAvg - rPreAvg) / (5 - rPreAvg)) * 100;
        }

        return { pre: rPreAvg, post: rPostAvg, perceivedRate, netGrowthRate, potentialGrowthRate };
      }).filter(Boolean);

      const pPerceivedGrowthAvg = respondentGrowthStats.length > 0 
        ? respondentGrowthStats.reduce((acc, curr: any) => acc + curr.perceivedRate, 0) / respondentGrowthStats.length 
        : 0;
      const pNetGrowthAvg = respondentGrowthStats.length > 0 
        ? respondentGrowthStats.reduce((acc, curr: any) => acc + curr.netGrowthRate, 0) / respondentGrowthStats.length 
        : 0;
      const pPotentialGrowthAvg = respondentGrowthStats.length > 0 
        ? respondentGrowthStats.reduce((acc, curr: any) => acc + curr.potentialGrowthRate, 0) / respondentGrowthStats.length 
        : 0;

      const getCategoryMatches = (qCat: string, qContent: string) => {
        const text = qContent || "";
        const cat = qCat || "";

        // 1. Check for Essay/Subjective
        if (text.includes("적어주세요") || text.includes("의견") || text.includes("기억에 남는") || text.includes("개선") || text.includes("건의") || text.includes("바라는")) return "주관식";
        
        // 2. Satisfaction Categories
        if (text.includes("접근성") || text.includes("장소") || text.includes("교통")) return "운영지원";
        if (text.includes("장비") || text.includes("쾌적") || text.includes("환경") || text.includes("공간")) return "교육환경";
        if (text.includes("체계성") || text.includes("유익") || text.includes("도움") || text.includes("구성") || text.includes("내용")) return "교육내용";
        if (text.includes("전문") || text.includes("진행") || text.includes("강사") || text.includes("멘토") || text.includes("친절")) return "강사만족";
        if (text.includes("추천") || text.includes("전반적") || text.includes("다시") || text.includes("전체적으로")) return "종합만족";

        
        // 3. Competency/Maturity Categories
        if (text.includes("가치관") || text.includes("적성") || text.includes("나를")) return "자기이해";
        if (text.includes("전공") || text.includes("동향") || text.includes("정보를") || text.includes("직업군")) return "정보탐색";
        if (text.includes("조건을 고려") || text.includes("목표를 확립") || text.includes("의사결정")) return "진로결정";
        if (text.includes("로드맵") || text.includes("계획") || text.includes("준비")) return "계획수립";
        if (text.includes("갈등") || text.includes("극복") || text.includes("제약") || text.includes("협력")) return "문제해결";
        if (text.includes("유연하게") || text.includes("책임감") || text.includes("태도")) return "직업태도";
        
        // 4. Default Fallback
        // 4. Default Fallback
        if (isSatCat(cat, text)) return "종합만족"; 
        
        const finalCat = cat.includes('|') ? cat.split('|').pop() : cat;
        return finalCat || "역량";
      };

      // Radar Data (Grouped by Category)
      const pCompAnswers = maturityResponses.flatMap(r => r.answers).filter(a => a.question?.type !== 'ESSAY');
      const mappedCompAnswers = pCompAnswers.map(a => ({ ...a, mappedCat: getCategoryMatches(a.question?.category, a.question?.content) }));
      const pCompCategories = Array.from(new Set(mappedCompAnswers.map(a => a.mappedCat))).filter(Boolean);
      
      const pRadarData = pCompCategories.map(cat => {
        const catAns = mappedCompAnswers.filter((a: any) => a.mappedCat === cat);
        const catPre = catAns.reduce((acc: number, a: any) => acc + (a.preScore || 0), 0) / catAns.length;
        const catPost = catAns.reduce((acc: number, a: any) => {
            let p = 0;
            if (a.question?.growthType === 'CHANGE') p = (a.preScore || 0) + (a.postChange || 0);
            else p = a.score || 0;
            return acc + Math.min(5, Math.max(1, p));
        }, 0) / catAns.length;

        let potential = 0;
        if (catPre >= 5) {
          potential = catPost >= 5 ? 100 : -100;
        } else {
          potential = ((catPost - catPre) / (5 - catPre)) * 100;
        }

        return {
          subject: cat,
          A: parseFloat(catPre.toFixed(2)),
          B: parseFloat(catPost.toFixed(2)),
          growth: ((catPost - catPre) / 5) * 100, // 카테고리별 역량 도달률 산식 적용
          potentialGrowth: parseFloat(potential.toFixed(1))
        };
      });

      // Satisfaction & Subjective (template.type 기반으로 분류된 만족도 응답 사용)
      const pSatAnswers = satisfactionResponses.flatMap(r => r.answers).filter(a => a.question?.type !== 'ESSAY');
      const mappedSatAnswers = pSatAnswers.map(a => ({ ...a, mappedCat: getCategoryMatches(a.question?.category, a.question?.content) }));
      const pSatCategories = Array.from(new Set(mappedSatAnswers.map(a => a.mappedCat))).filter(cat => cat && cat !== "주관식");
      const pSatisfactionData = pSatCategories.map(cat => {
        const catAns = mappedSatAnswers.filter(a => a.mappedCat === cat);
        const avg = catAns.reduce((acc, a) => acc + (a.score || 0), 0) / catAns.length;
        return { name: cat, score: parseFloat(avg.toFixed(2)) };
      });
      const pOverallSat = pSatisfactionData.length > 0 ? pSatisfactionData.reduce((acc, curr) => acc + curr.score, 0) / pSatisfactionData.length : 0;

      // 질문(문항) 기반 주관식 수집: 모든 응답(만족도+성숙도)에서 주관식 추출
      const allAnswers = pResponses.flatMap((r: any) => r.answers);
      const allMappedAnswers = allAnswers.map((a: any) => ({ ...a, mappedCat: getCategoryMatches(a.question?.category, a.question?.content) }));
      const subjectiveAnswers = allMappedAnswers.filter(a =>
        (a.mappedCat === "주관식" || a.question?.type === "ESSAY") &&
        a.text && a.text.trim()
      );

      // 질문 ID 기준으로 그룹화
      const questionGroupMap = new Map<string, { questionId: string, questionContent: string, questionCategory: string, answers: string[] }>();
      subjectiveAnswers.forEach(a => {
        const qId = a.question?.id || "unknown";
        if (!questionGroupMap.has(qId)) {
          questionGroupMap.set(qId, {
            questionId: qId,
            questionContent: a.question?.content || "",
            questionCategory: a.question?.category || "",
            answers: []
          });
        }
        questionGroupMap.get(qId)!.answers.push(a.text);
      });

      const pSubjectiveData = {
        questions: Array.from(questionGroupMap.values())
      };


      return {
        programId: pid,
        programName: `${pProgram.order}. ${pProgram.name}`,
        order: pProgram.order || 0,
        stats: {
          totalRespondents: pResponses.length,
          perceivedGrowth: parseFloat(Math.max(0, pPerceivedGrowthAvg).toFixed(1)), 
          netGrowth: parseFloat(pNetGrowthAvg.toFixed(1)), 
          potentialGrowth: parseFloat(pPotentialGrowthAvg.toFixed(1)),
          overallSatisfaction: parseFloat(pOverallSat.toFixed(2))
        },
        radarData: pRadarData,
        satisfactionData: pSatisfactionData,
        subjectiveData: pSubjectiveData
      };
    });

    // 4. Overall Global Stats
    const globalStats = programReports.reduce((acc, curr) => {
        acc.pgr += curr.stats.perceivedGrowth * curr.stats.totalRespondents;
        acc.ngr += curr.stats.netGrowth * curr.stats.totalRespondents;
        acc.pgr2 += curr.stats.potentialGrowth * curr.stats.totalRespondents;
        acc.total += curr.stats.totalRespondents;
        return acc;
    }, { pgr: 0, ngr: 0, pgr2: 0, total: 0 });

    programReports.sort((a, b) => a.order - b.order);

    return NextResponse.json({
      overallStats: {
        totalRespondents: globalStats.total,
        perceivedGrowth: globalStats.total > 0 ? parseFloat((globalStats.pgr / globalStats.total).toFixed(1)) : 0,
        netGrowth: globalStats.total > 0 ? parseFloat((globalStats.ngr / globalStats.total).toFixed(1)) : 0,
        potentialGrowth: globalStats.total > 0 ? parseFloat((globalStats.pgr2 / globalStats.total).toFixed(1)) : 0
      },
      programReports
    });
  } catch (error) {
    console.error("Survey analytics error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
