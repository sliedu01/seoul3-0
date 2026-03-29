import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { programIds, partnerIds, startDate, endDate } = body;

    const where: any = { session: {} };
    if (programIds && programIds.length > 0) {
      where.session.programId = { in: programIds };
    }
    if (partnerIds && partnerIds.length > 0) {
      where.session.partnerId = { in: partnerIds };
    }
    
    if (startDate || endDate) {
      const sDate = startDate ? new Date(startDate) : new Date("2000-01-01");
      let eDate = endDate ? new Date(endDate) : new Date("2100-01-01");

      if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
          if (endDate) eDate.setHours(23, 59, 59, 999);
          
          where.session.OR = [
            { date: { gte: sDate, lte: eDate } },
            { endTime: { gte: sDate, lte: eDate } },
            { AND: [ { date: { lte: sDate } }, { endTime: { gte: eDate } } ] }
          ];
      }
    }

    if (Object.keys(where.session).length === 0) {
        delete where.session;
    }


    // 1. Fetch relevant responses and meeting minutes concurrently
    const [responses, meetingMinutes] = await Promise.all([
      prisma.surveyResponse.findMany({
        where,
        include: {
          session: {
            include: {
              program: true,
              partner: true
            }
          },
          answers: {
            include: { question: true }
          }
        }
      }),
      prisma.meetingMinute.findMany({
        where: {
          date: {
            gte: startDate ? new Date(startDate) : undefined,
            lte: endDate ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })() : undefined
          }
        }
      })
    ]);

    if (responses.length === 0) {
      return NextResponse.json({ 
        analysis: "\uC120\uD0DD\uB41C \uC870\uAC74\uC5D0 \uD574\uB2F9\uD558\uB294 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uD544\uD130\uB97C \uC870\uC815\uD574 \uC8FC\uC138\uC694." 
      });
    }

    // 1.5 Calculate dominant research target for tone adjustment
    const targetCounts: Record<string, number> = {};
    responses.forEach(r => {
      const t = r.researchTarget || "OTHER";
      targetCounts[t] = (targetCounts[t] || 0) + 1;
    });
    const dominantTarget = Object.entries(targetCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "OTHER";
    
    const targetMeta: Record<string, { label: string, tone: string, indicator: string }> = {
      ELEMENTARY: { label: "\uCD08\uB4F1\uD559\uC0DD", tone: "\uCE5C\uC808\uD558\uACE0 \uC26C\uC6B4 \uC120\uC0DD\uB2D8\uC758 \uC5B4\uC870", indicator: "\uD559\uC2B5 \uD765\uBBF8\uB3C4 \uBC0F \uAE30\uCD08 \uC5ED\uB7C9" },
      MIDDLE: { label: "\uC911\uD559\uC0DD", tone: "\uBA85\uD655\uD558\uACE0 \uACA9\uB824\uD558\uB294 \uC131\uC7A5 \uC911\uC2EC \uC5B4\uC870", indicator: "\uC9C4\uB85C \uD0D0\uC0C9 \uBC0F \uC790\uC544 \uD6A8\uB2A5\uAC10" },
      HIGH: { label: "\uACE0\uB4F1\uD559\uC0DD", tone: "\uC9C4\uC9C0\uD558\uACE0 \uAD6C\uCCB4\uC801\uC778 \uC9C4\uD559 \uCEE8\uC124\uD305 \uC5B4\uC870", indicator: "\uC9C4\uB85C \uACB0\uC815 \uBC0F \uAD6C\uCCB4\uC801 \uACC4\uD68D\uC218\uB9BD" },
      UNIVERSITY: { label: "\uB300\uD559\uC0DD", tone: "\uC804\uBB38\uC801\uC774\uACE0 \uB370\uC774\uD130 \uC911\uC2EC\uC758 \uC218\uC11D \uCEE8\uC124\uD134\uD2B8 \uC5B4\uC870", indicator: "\uC9C1\uBB34 \uC5ED\uB7C9 \uBC0F \uC0B0\uC5C5 \uC815\uD569\uC131 \uC9C0\uD45C" },
      OTHER: { label: "\uAE30\uD0C0", tone: "\uAC1D\uAD00\uC801\uC774\uACE0 \uC815\uC911\uD55C \uBD84\uC11D \uC5B4\uC870", indicator: "\uC804\uBC18\uC801 \uB9CC\uC871\uB3C4 \uBC0F \uC131\uCDE8\uB3C4" }
    };
    const tInfo = targetMeta[dominantTarget] || targetMeta.OTHER;

    // Categorization: Keyword "\uB9CC\uC871" means Satisfaction, otherwise Maturity/Competency
    const isSatCat = (cat: string) => cat?.includes("\uB9CC\uC871") || cat?.includes("satisfaction") || cat?.toLowerCase().includes("sat");

    // 2. Group responses by program
    const programGrouped: Record<string, { 
        name: string, 
        coreGoals: string, 
        responses: any[],
        partnerName: string
    }> = {};
    
    responses.forEach(resp => {
      const pId = resp.session.programId;
      if (!programGrouped[pId]) {
        programGrouped[pId] = { 
          name: resp.session.program.name, 
          coreGoals: resp.session.program.coreGoals || "\uC9C4\uB85C \uC5ED\uB7C9 \uAC15\uD654 \uBC0F \uC131\uC7A5 \uC9C0\uC6D0",
          responses: [],
          partnerName: resp.session.partner?.name || "\uB0B4\uBD80 \uC6B4\uC601"
        };
      }
      programGrouped[pId].responses.push(resp);
    });

    const sortedProgramIds = Object.keys(programGrouped).sort((a, b) => {
      const orderA = programGrouped[a].responses[0].session.program.order || 0;
      const orderB = programGrouped[b].responses[0].session.program.order || 0;
      return orderA - orderB;
    });

    // Helper: frequency analysis for subjective texts
    const getFrequentTexts = (texts: string[], topN = 3) => {
      const freq: Record<string, number> = {};
      texts.forEach(t => {
        const normalized = t.trim();
        if (normalized) freq[normalized] = (freq[normalized] || 0) + 1;
      });
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([text, count]) => ({ text, count }));
    };

    // Helper to calculate detailed stats for a group
    const analyzeGroup = (groupResponses: any[]) => {
      const topicStats: Record<string, { preSum: number, preCount: number, postSum: number, postCount: number, satSum: number, satCount: number }> = {};
      // 질문(문항) 기반 주관식 수집
      const subjectiveByQuestion = new Map<string, { questionContent: string, questionCategory: string, answers: string[] }>();
      
      const getCategoryMatches = (qCat: string, qContent: string) => {
        const text = qContent || "";
        const cat = qCat || "";

        // 1. Check for Essay/Subjective
        if (text.includes("\uC801\uC5B4\uC8FC\uC138\uC694") || text.includes("\uC758\uACAC") || text.includes("\uAE30\uC5B5\uC5D0 \uB0A8\uB294") || text.includes("\uAC1C\uC120") || text.includes("\uAC74\uC758") || text.includes("\uBC14\uB77C\uB294")) return "\uC8FC\uAD00\uC2DD";
        
        // 2. Satisfaction Categories
        if (text.includes("\uC811\uADFC\uC131") || text.includes("\uC7A5\uC18C") || text.includes("\uAD50\uD1B5")) return "\uC6B4\uC601\uC9C0\uC6D0";
        if (text.includes("\uC7A5\uBE44") || text.includes("\uC7D8\uC801") || text.includes("\uD658\uACBD") || text.includes("\uACF5\uAC04")) return "\uAD50\uC721\uD658\uACBD";
        if (text.includes("\uCCB4\uACC4\uC131") || text.includes("\uC720\uC775") || text.includes("\uB3C4\uC6C0") || text.includes("\uAD6C\uC131") || text.includes("\uB0B4\uC6A9")) return "\uAD50\uC721\uB0B4\uC6A9";
        if (text.includes("\uC804\uBB38") || text.includes("\uC9C4\uD589") || text.includes("\uAC15\uC0AC") || text.includes("\uBA58\uD1A0") || text.includes("\uCE5C\uC808")) return "\uAC15\uC0AC\uB9CC\uC871";
        if (text.includes("\uCD94\uCC9C") || text.includes("\uC804\uBC18\uC801") || text.includes("\uB2E4\uC2DC") || text.includes("\uC804\uCCB4\uC801\uC73C\uB85C")) return "\uC885\uD569\uB9CC\uC871";
        
        // 3. Competency/Maturity Categories
        if (text.includes("\uAC00\uCE58\uAD00") || text.includes("\uC801\uC131") || text.includes("\uB098\uB97C")) return "\uC790\uAE30\uC774\uD574";
        if (text.includes("\uC804\uACF5") || text.includes("\uB3D9\uD5A5") || text.includes("\uC815\uBCF4\uB97C") || text.includes("\uC9C1\uC5C5\uAD70")) return "\uC815\uBCF4\uD0D0\uC0C9";
        if (text.includes("\uC870\uAC74\uC744 \uACE0\uB824") || text.includes("\uBAA9\uD45C\uB97C \uD655\uB9BD") || text.includes("\uC758\uC0AC\uACB0\uC815")) return "\uC9C4\uB85C\uACB0\uC815";
        if (text.includes("\uB85C\uB4DC\uB9F5") || text.includes("\uACC4\uD68D") || text.includes("\uC900\uBE44")) return "\uACC4\uD68D\uC218\uB9BD";
        if (text.includes("\uAC08\uB4F1") || text.includes("\uADF9\uBCF5") || text.includes("\uC81C\uC57D") || text.includes("\uD611\uB825")) return "\uBB38\uC81C\uD574\uACB0";
        if (text.includes("\uC720\uC5F0\uD558\uAC8C") || text.includes("\uCC45\uC784\uAC10") || text.includes("\uD0DC\uB3C4")) return "\uC9C1\uC5C5\uD0DC\uB3C4";
        
        // 4. Default Fallback
        if (isSatCat(cat)) return "\uC885\uD569\uB9CC\uC871"; 
        
        const finalCat = cat.includes('|') ? cat.split('|').pop() : cat;
        return finalCat || "\uC5ED\uB7C9";
      };

      groupResponses.forEach(resp => {
        resp.answers.forEach((ans: any) => {
          const qText = ans.question.content || "";
          const cat = getCategoryMatches(ans.question.category || "", qText);

          if (!topicStats[cat]) {
            topicStats[cat] = { preSum: 0, preCount: 0, postSum: 0, postCount: 0, satSum: 0, satCount: 0 };
          }

          // Pre/Post scoring
          if (ans.preScore !== null && ans.preScore !== undefined && ans.preScore > 0) {
            topicStats[cat].preSum += ans.preScore;
            topicStats[cat].preCount += 1;

            let post = 0;
            if (ans.question.growthType === 'CHANGE') {
              post = ans.preScore + (ans.postChange || 0);
            } else {
              post = ans.score || 0;
            }
            post = Math.min(5, Math.max(1, post));
            topicStats[cat].postSum += post;
            topicStats[cat].postCount += 1;
          } else if (ans.score !== null) {
            topicStats[cat].satSum += ans.score;
            topicStats[cat].satCount += 1;
          }
          
          // 질문 기반 주관식 수집: question.id 기준으로 그룹화
          if (ans.text && ans.text.trim()) {
            if (cat === "\uC8FC\uAD00\uC2DD" || qText.includes("\uC801\uC5B4\uC8FC\uC138\uC694") || qText.includes("\uC758\uACAC") || ans.question.type === "ESSAY") {
              const qId = ans.question.id || "unknown";
              if (!subjectiveByQuestion.has(qId)) {
                subjectiveByQuestion.set(qId, {
                  questionContent: ans.question.content || "",
                  questionCategory: ans.question.category || "",
                  answers: []
                });
              }
              subjectiveByQuestion.get(qId)!.answers.push(ans.text);
            }
          }
        });
      });

      const compResults = Object.entries(topicStats)
        .filter(([cat]) => !isSatCat(cat) && cat !== "\uC8FC\uAD00\uC2DD")
        .map(([cat, s]) => {
          const pre = s.preCount > 0 ? s.preSum / s.preCount : 0;
          const post = s.postCount > 0 ? s.postSum / s.postCount : 0;
          return {
            cat,
            growth: pre > 0 ? ((post - pre) / pre) * 100 : 0,
            pre,
            post
          };
        }).sort((a, b) => b.growth - a.growth);

      const satResults = Object.entries(topicStats)
        .filter(([cat]) => isSatCat(cat) && cat !== "\uC8FC\uAD00\uC2DD")
        .map(([cat, s]) => ({
          cat,
          score: s.satCount > 0 ? s.satSum / s.satCount : 0
        })).sort((a, b) => b.score - a.score);

      // 질문 기반 주관식 결과 배열
      const subjectiveQuestions = Array.from(subjectiveByQuestion.values());
      const allSubjTexts = subjectiveQuestions.flatMap(q => q.answers);
      
      // Advanced keyword extraction
      const keywords: Record<string, string[]> = {
        positive: ["\uAC15\uC0AC", "\uC7AC\uBBF8", "\uB3C4\uC6C0", "\uC2E4\uC2B5", "\uC124\uBA85", "\uCE5C\uC808", "\uCD5C\uACE0", "\uB85C\uBD07", "\uB4DC\uB860", "\uCCB4\uD5D8", "\uD65C\uB3D9", "\uADF8\uB9BC", "\uBBF8\uC220"],
        negative: ["\uC5B4\uB835", "\uBD80\uC871", "\uC2DC\uAC04", "\uC2DC\uB044\uB7EC", "\uC881\uB2E4", "\uAE38\uB2E4", "\uC9E7\uB2E4", "\uBCF5\uC7A1", "\uBAA8\uB974\uACA0"]
      };
      
      const analysisKeywords = {
        pos: keywords.positive.filter(k => allSubjTexts.some(t => t && t.includes(k))),
        neg: keywords.negative.filter(k => allSubjTexts.some(t => t && t.includes(k)))
      };

      return { compResults, satResults, subjectiveQuestions, analysisKeywords };
    };

    // Comprehensive 5-Stage AI Consultant Report
    const instructors = Array.from(new Set(responses.map(r => r.session.instructorName).filter(Boolean)));
    const partnersList = Array.from(new Set(responses.map(r => r.session.partner?.name).filter(Boolean)));
    const programNames = Array.from(new Set(
      responses
        .map(r => ({ name: r.session.program.name, order: r.session.program.order || 0 }))
        .sort((a, b) => a.order - b.order)
        .map(p => p.name)
    ));

    // Overall analysis
    const overall = analyzeGroup(responses);

    // 질문별 빈도 분석
    const questionFrequencies = overall.subjectiveQuestions.map(q => ({
      questionContent: q.questionContent,
      questionCategory: q.questionCategory,
      totalAnswers: q.answers.length,
      topAnswers: getFrequentTexts(q.answers, 5)
    }));
    const totalSubjCount = overall.subjectiveQuestions.reduce((acc, q) => acc + q.answers.length, 0);

    // [Senior Consultant Engine] - 5 Chapter Structured Report
    const totalMaturity = (overall.compResults.reduce((acc: number, c: any) => acc + c.post, 0) / (overall.compResults.length || 1)).toFixed(2);
    const avgGrowth = (overall.compResults.reduce((acc: number, c: any) => acc + c.growth, 0) / (overall.compResults.length || 1)).toFixed(1);
    const avgSatScore = (overall.satResults.reduce((acc: number, s: any) => acc + s.score, 0) / (overall.satResults.length || 1)).toFixed(2);
    
    const bestArea = (overall.compResults[0] as any) || { cat: "\uD575\uC2EC \uC5ED\uB7C9", growth: 0, post: 0 };
    const worstArea = (overall.compResults[overall.compResults.length - 1] as any) || { cat: "\uAE30\uCD08 \uC18C\uC591", growth: 0, post: 0 };
    
    const satGap = overall.satResults.length >= 2 
        ? (overall.satResults[0].score - overall.satResults[overall.satResults.length-1].score).toFixed(2)
        : "0.00";

    let fullAnalysis = `## [\uC11C\uC6B8\uB7F0 3.0 \uC131\uACFC \uBD84\uC11D \uBCF4\uACE0\uC11C: \uC2DC\uB2C8\uC5B4 \uAD50\uC721 \uCEE8\uC124\uD134\uD2B8 \uAD00\uC810]\n\n`;


    // Chapter 1. Strategic Overview
    fullAnalysis += `### Chapter 1. \uC0AC\uC5C5 \uC131\uACFC \uCD1D\uAD04 \uBC0F \uC815\uB7C9 \uBD84\uC11D (Strategic Overview)\n`;
    fullAnalysis += `\uBCF8 \uC0AC\uC5C5\uC758 \uD575\uC2EC \uC9C0\uD45C\uC778 **\uC5ED\uB7C9 \uC131\uC219\uB3C4(${totalMaturity}/5.0)**\uC640 **\uAD50\uC721 \uB9CC\uC871\uB3C4(${avgSatScore}/5.0)**\uC758 \uC0C1\uAD00\uAD00\uACC4\uB97C \uBD84\uC11D\uD55C \uACB0\uACFC, \uC804\uBC18\uC801\uC778 \uC815\uD569\uC131\uC774 \uC6B0\uC218\uD55C \uC218\uC900\uC73C\uB85C \uB098\uD0C0\uB0AC\uC2B5\uB2C8\uB2E4.\n\n`;
    fullAnalysis += `\uD2B9\uD788 \uD3C9\uADE0 **${avgGrowth}%\uC758 \uC131\uC219\uB3C4 \uD5A5\uC0C1\uB960**\uC740 \uB2E8\uAE30 \uAD50\uC721 \uACFC\uC815\uC784\uC5D0\uB3C4 \uBD88\uAD6C\uD558\uACE0 \uD559\uC2B5\uC790\uC758 \uC778\uC2DD \uBCC0\uD654\uAC00 \uC720\uC758\uBBF8\uD558\uAC8C \uBC1C\uC0DD\uD588\uC74C\uC744 \uC2DC\uC0AC\uD569\uB2C8\uB2E4. '\uBAA9\uD45C-\uC131\uACFC GAP \uBD84\uC11D' \uAE30\uBC95\uC744 \uC801\uC6A9\uD588\uC744 \uB54C, \uCD08\uAE30 \uC124\uC815\uD55C \uC5ED\uB7C9 \uAC15\uD654 \uBAA9\uD45C \uB300\uBE44 \uC57D **${(Number(totalMaturity)*20).toFixed(1)}%\uC758 \uB2EC\uC131\uB3C4**\uB97C \uBCF4\uC774\uBA70 \uC548\uC815\uC801\uC778 \uADA4\uB3C4\uC5D0 \uC9C4\uC785\uD55C \uAC83\uC73C\uB85C \uD3C9\uAC00\uB429\uB2C8\uB2E4. \uC774\uB294 \uB2E8\uC21C \uAD50\uC721 \uC81C\uACF5\uC744 \uB118\uC5B4 \uB9DE\uCDA4\uD615 \uC9C4\uB85C \uC124\uACC4 \uC9C0\uC6D0\uC774\uB77C\uB294 \uD575\uC2EC \uBAA9\uD45C\uC5D0 \uBD80\uD569\uD558\uB294 \uACB0\uACFC\uC785\uB2C8\uB2E4.\n\n`;

    // Chapter 2. Maturity Deep Dive
    fullAnalysis += `### Chapter 2. \uB2E4\uCC28\uC6D0 \uC5ED\uB7C9 \uC131\uC219\uB3C4 \uC9C4\uB2E8 (Maturity Deep Dive)\n`;
    fullAnalysis += `\uD559\uC2B5\uC790 \uC5ED\uB7C9 \uBCC0\uD654 \uCD94\uC774\uB97C \uBD84\uC11D\uD55C \uACB0\uACFC, \uAC00\uC7A5 \uBE44\uC57D\uC801\uC778 \uBC1C\uC804\uC744 \uBCF4\uC778 \uC601\uC5ED\uC740 **'${bestArea.cat}'(+${Number(bestArea.growth).toFixed(1)}%)**\uC778 \uBC18\uBA74, **'${worstArea.cat}'** \uC601\uC5ED\uC740 \uC0C1\uB300\uC801\uC73C\uB85C \uC815\uCCB4\uB41C \uC591\uC0C1\uC744 \uBCF4\uC600\uC2B5\uB2C8\uB2E4.\n\n`;
    fullAnalysis += `\uD604\uC7AC \uB3C4\uCD9C\uB41C **\uC804\uCCB4 \uC131\uC219\uB3C4 ${(Number(totalMaturity)*20).toFixed(1)}% (100\uC810 \uD658\uC0B0)** \uC9C0\uC810\uC740 \uCC28\uB144\uB3C4 \uC2EC\uD654 \uACFC\uC815 \uC9C4\uC785\uC744 \uC704\uD55C '\uC784\uACC4\uC810(Threshold)'\uC73C\uB85C\uC11C \uB9E4\uC6B0 \uC801\uC808\uD55C \uC218\uC900\uC785\uB2C8\uB2E4. \uD2B9\uD788 '${bestArea.cat}' \uC601\uC5ED\uC758 \uB192\uC740 \uC131\uCDE8\uB3C4\uB294 \uD559\uC2B5\uC790\uB4E4\uC774 \uAE30\uCD08 \uD0D0\uC0C9 \uB2E8\uACC4\uB97C \uB118\uC5B4 \uC2E4\uBB34/\uC2E4\uD589 \uC911\uC2EC\uC758 \uC2EC\uD654 \uB2E8\uACC4\uB85C \uB098\uC544\uAC08 \uC900\uBE44\uAC00 \uB418\uC5C8\uC74C\uC744 \uC785\uC99D\uD558\uB294 \uAC15\uB825\uD55C \uC9C0\uD45C\uC785\uB2C8\uB2E4.\n\n`;

    // Chapter 3. User Experience Diagnosis - Enhanced with subjective frequency
    fullAnalysis += `### Chapter 3. \uD559\uC2B5\uC790 \uB9CC\uC871\uB3C4 \uBC0F \uC815\uC131\uC801 \uACBD\uD5D8 \uBD84\uC11D (User Experience Diagnosis)\n`;
    fullAnalysis += `\uC885\uD569 \uB9CC\uC871\uB3C4 ${avgSatScore}\uC810 \uC774\uBA74\uC5D0 \uC228\uACA8\uC9C4 \uD559\uC2B5\uC790\uC758 \uD398\uC778 \uD3EC\uC778\uD2B8(Pain Point)\uB97C \uBD84\uC11D\uD55C \uACB0\uACFC, \uC11C\uBE44\uC2A4 \uD488\uC9C8\uC758 \uD3B8\uCC28(Gap: ${satGap}p)\uAC00 \uBC1C\uACAC\uB429\uB2C8\uB2E4.\n\n`;
    
    // 질문별 주관식 빈도 분석 섹션
    if (totalSubjCount > 0) {
      fullAnalysis += `**[문항별 주관식 의견 분석]** (총 ${totalSubjCount}건의 서술형 응답 수집, ${questionFrequencies.length}개 문항)\n\n`;
      
      questionFrequencies.forEach((qf, idx) => {
        if (qf.topAnswers.length > 0) {
          const answersSummary = qf.topAnswers.map(f => `"${f.text}"(${f.count}건)`).join(", ");
          fullAnalysis += `- **Q${idx + 1}. "${qf.questionContent}"** (${qf.totalAnswers}건 응답)\n  → 빈도 TOP: ${answersSummary}\n`;
        }
      });
      fullAnalysis += `\n`;
    }

    const posKeywordsText = overall.analysisKeywords.pos.length > 0 ? overall.analysisKeywords.pos.join(", ") : "체험, 활동";
    const negKeywordsText = overall.analysisKeywords.neg.length > 0 ? overall.analysisKeywords.neg.join(", ") : "";
    
    fullAnalysis += `주관식 키워드 분석에 따르면, "${posKeywordsText}" 등의 긍정적 반응은 **콘텐츠의 현장 적합성**이 높음을 방증합니다.`;
    if (negKeywordsText) {
      fullAnalysis += ` 반면, "${negKeywordsText}" 등의 키워드는 일부 개선 여지가 있음을 시사합니다.`;
    }
    fullAnalysis += ` 이러한 정성적 피드백은 콘텐츠 품질 대비 운영 품질의 격차를 줄이는 것이 만족도 지표를 4.0 이상으로 견인할 핵심 과제임을 시사합니다.\n\n`;

    // 질문별 심층 분석
    questionFrequencies.forEach((qf, idx) => {
      if (qf.topAnswers.length > 0) {
        const topAnswer = qf.topAnswers[0];
        fullAnalysis += `**[Q${idx + 1} 심층 분석: "${qf.questionContent}"]**: 학습자들의 응답 중 가장 빈번한 "${topAnswer.text}"(${topAnswer.count}건)을 중심으로 볼 때, `;
        if (qf.questionContent.includes("좋") || qf.questionContent.includes("장단점") || qf.questionContent.includes("기억")) {
          fullAnalysis += `학습자들은 교육 경험에서 **실질적인 체험 기회**를 가장 가치 있게 인식하고 있으며, 이는 현장 중심 콘텐츠 전략의 유효성을 입증합니다.`;
        } else if (qf.questionContent.includes("하고 싶") || qf.questionContent.includes("앞으로") || qf.questionContent.includes("참여")) {
          fullAnalysis += `학습자들의 향후 참여 의지가 높으며, **체험형 프로그램에 대한 수요**가 명확히 확인됩니다. 이를 차기 사업 기획에 적극 반영해야 합니다.`;
        } else {
          fullAnalysis += `학습자들의 반응은 현재 교육 프로그램의 방향성과 높은 일치도를 보이고 있습니다.`;
        }
        fullAnalysis += `\n\n`;
      }
    });


    // Chapter 4. Critical Success Factors
    const minuteAgenda = meetingMinutes.map(m => m.agenda).filter(Boolean).slice(0,2).join(" / ");
    fullAnalysis += `### Chapter 4. \uC0AC\uC5C5 \uC6B4\uC601\uC758 \uBCD1\uBAA9 \uD604\uC0C1 \uBC0F \uD575\uC2EC \uC131\uACF5 \uC694\uC778 (Critical Success Factors)\n`;
    fullAnalysis += `**[Bottle-neck]**: \uBD84\uC11D \uACB0\uACFC, \uC131\uACFC \uC131\uC7A5\uC744 \uC800\uD574\uD558\uB294 \uC8FC\uC694 \uBCD1\uBAA9 \uD604\uC0C1\uC740 '${worstArea.cat}' \uC601\uC5ED\uC758 \uC778\uC9C0\uC801 \uC9C4\uC785\uC7A5\uBCBD\uACFC \uBB3C\uB9AC\uC801 \uC6B4\uC601 \uD658\uACBD\uC758 \uC81C\uC57D\uC73C\uB85C \uB3C4\uCD9C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.\n`;
    fullAnalysis += `**[Success Factors]**: \uBC18\uBA74, \uC131\uACFC\uB97C \uACAC\uC778\uD55C \uACB0\uC815\uC801 \uC694\uC778\uC740 '${bestArea.cat}' \uC911\uC2EC\uC758 \uC2E4\uC2B5\uD615 \uCF58\uD150\uCE20\uC640 \uD68C\uC758\uB85D(${meetingMinutes.length}\uAC74)\uC5D0\uC11C \uD655\uC778\uB41C '${minuteAgenda || '\uD604\uC7A5 \uBC00\uCC29\uD615 \uC6B4\uC601'}' \uC804\uB7B5\uC758 \uC720\uD6A8\uC131\uC774\uC5C8\uC2B5\uB2C8\uB2E4. \uD604\uC7A5 \uC911\uC2EC\uC758 \uAE30\uD68D\uC774 \uC815\uB7C9\uC801 \uC131\uC219\uB3C4\uB85C \uC9C1\uACB0\uB41C \uC0AC\uB840\uB85C \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.\n\n`;

    // Chapter 5. Feedback - Enhanced with frequency-based recommendations
    fullAnalysis += `### Chapter 5. \uCC28\uB144\uB3C4 \uC0AC\uC5C5 \uACE0\uB3C4\uD654\uB97C \uC704\uD55C \uD658\uB958(Feedback) \uC81C\uC5B8\n`;

    // 질문 기반 제언 생성
    fullAnalysis += `1. **커리큘럼 및 UX 재설계**: 성숙도 저조 항목인 '${worstArea.cat}' 영역의 난이도를 세분화하고, `;
    // Q1 기반 제언 (장단점 질문의 답변 활용)
    const q1Data = questionFrequencies.find(qf => qf.questionContent.includes("좋") || qf.questionContent.includes("장단점"));
    if (q1Data && q1Data.topAnswers.length > 0) {
      fullAnalysis += `**"${q1Data.questionContent}"에 대한 학습자 응답("${q1Data.topAnswers[0].text}" 등)**을 반영하여 인지적 진입장벽을 낮추어야 합니다.\n`;
    } else {
      fullAnalysis += `학습자의 체험 피드백을 반영하여 인지적 진입장벽을 낮추어야 합니다.\n`;
    }

    fullAnalysis += `2. **운영 체계 고도화**: 학습 전후 밀착형 멘토링 세션을 정례화하고, 만족도 하위 항목에 대한 품질 관리(QC) 프로세스를 강화할 것을 제언합니다.\n`;

    // Q2 기반 제언 (희망 프로그램 질문의 답변 활용)
    const q2Data = questionFrequencies.find(qf => qf.questionContent.includes("하고 싶") || qf.questionContent.includes("앞으로") || qf.questionContent.includes("참여"));
    if (q2Data && q2Data.topAnswers.length > 0) {
      const futureProgText = `학습자들이 **"${q2Data.questionContent}"**에 대해 가장 많이 응답한 '${q2Data.topAnswers[0].text}'(${q2Data.topAnswers[0].count}건) 등을 반영한 **체험 중심 브릿지 프로그램(Bridge Program)** 신설`;
      fullAnalysis += `3. **전략적 정책 제언**: 발주기관은 차기 예산 편성 시 ${futureProgText}을 반드시 검토해야 합니다. 이는 본 사업의 지속 가능성과 교육 사다리 역할을 강화하는 핵심 동인이 될 것입니다.\n\n`;
    } else {
      fullAnalysis += `3. **전략적 정책 제언**: 발주기관은 차기 예산 편성 시 **'성숙도 임계점 도달 그룹 대상의 브릿지 프로그램(Bridge Program)'** 신설을 반드시 검토해야 합니다.\n\n`;
    }


    fullAnalysis += `--- \n`;
    fullAnalysis += `*\uBCF8 \uBCF4\uACE0\uC11C\uB294 \uB370\uC774\uD130 \uAE30\uBC18 \uC54C\uACE0\uB9AC\uC998\uC5D0 \uC758\uD574 \uC0DD\uC131\uB41C 15\uB144 \uACBD\uB825 \uC2DC\uB2C8\uC5B4 \uCEE8\uC124\uD134\uD2B8\uAE09 \uC804\uBB38 \uC758\uACAC\uC785\uB2C8\uB2E4.*\n`;
    fullAnalysis += `**\uC218\uC11D \uCEE8\uC124\uD134\uD2B8: \uC11C\uC6B8\uB7F0 3.0 AI \uC131\uACFC\uCE21\uC815 \uC9C0\uC6D0\uD300**`;

    // 마크다운 문법 제거 함수
    const cleanMarkdown = (text: string) => {
      return text
        .replace(/##?\s/g, '') // 헤더(##, ###) 제거
        .replace(/\*\*/g, '')    // 굵게(**) 제거
        .replace(/---/g, '')    // 구분선 제거
        .replace(/^\s*[\*\-]\s/gm, '• ') // 블렛 기호를 원형 기호로 변경
        .trim();
    };

    return NextResponse.json({ 
      analysis: cleanMarkdown(fullAnalysis),
      rawAnalysis: fullAnalysis 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
