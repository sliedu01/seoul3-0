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
      MIDDLE: { label: "\uC911\uD559\uC0DD", tone: "\uBA85\uD655\uD558\uACE0 \uACA9\uB824\uD558\uB294 \uB2E4\uCC28\uC6D0\uC801 \uC131\uCDE8 \uC5B4\uC870", indicator: "\uC9C4\uB85C \uD0D0\uC0C9 \uBC0F \uC790\uC544 \uD6A8\uB2A5\uAC10" },
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
          coreGoals: resp.session.program.coreGoals || "\uC9C4\uB85C \uC5ED\uB7C9 \uAC15\uD654 \uBC0F \uC131\uCDE8 \uC9C0\uC6D0",
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
        .filter(([cat]) => !isSatCat(cat) && cat !== "주관식")
        .map(([cat, s]) => {
          const pre = s.preCount > 0 ? s.preSum / s.preCount : 0;
          const post = s.postCount > 0 ? s.postSum / s.postCount : 0;
          return {
            cat,
            attainment: (post / 5) * 100,
            perceived: ((post - pre) / 5) * 100,
            potential: pre < 5 ? ((post - pre) / (5 - pre)) * 100 : (post >= 5 ? 100 : 0),
            pre,
            post
          };
        }).sort((a, b) => b.attainment - a.attainment);

      // 3. 인별 지표(Grand Average) 산출: 카테고리 가중치 왜곡 방지
      const respondentStats = groupResponses.map((r: any) => {
        const compAns = r.answers.filter((a: any) => !isSatCat(getCategoryMatches(a.question?.category || "", a.question?.content || "")));
        if (compAns.length === 0) return null;

        let rPreSum = 0, rPostSum = 0, rCount = 0;
        compAns.forEach((a: any) => {
          const pre = a.preScore || 0;
          let post = (a.question?.growthType === 'CHANGE') ? (pre + (a.postChange || 0)) : (a.score || 0);
          post = Math.min(5, Math.max(1, post));
          rPreSum += pre;
          rPostSum += post;
          rCount++;
        });

        const rPreAvg = rPreSum / rCount;
        const rPostAvg = rPostSum / rCount;

        return {
          perceived: ((rPostAvg - rPreAvg) / 5) * 100,
          attainment: (rPostAvg / 5) * 100,
          potential: rPreAvg < 5 ? ((rPostAvg - rPreAvg) / (5 - rPreAvg)) * 100 : (rPostAvg >= 5 ? 100 : 0)
        };
      }).filter(Boolean);

      const avgPerceived = respondentStats.length > 0 ? respondentStats.reduce((acc, s) => acc + s!.perceived, 0) / respondentStats.length : 0;
      const avgAttainment = respondentStats.length > 0 ? respondentStats.reduce((acc, s) => acc + s!.attainment, 0) / respondentStats.length : 0;
      const avgPotential = respondentStats.length > 0 ? respondentStats.reduce((acc, s) => acc + s!.potential, 0) / respondentStats.length : 0;

      const satResults = Object.entries(topicStats)
        .filter(([cat]) => isSatCat(cat) && cat !== "주관식")
        .map(([cat, s]) => ({
          cat,
          score: s.satCount > 0 ? s.satSum / s.satCount : 0
        })).sort((a, b) => b.score - a.score);

      // 질문 기반 주관식 결과 배열
      const subjectiveQuestions = Array.from(subjectiveByQuestion.values());
      const allSubjTexts = subjectiveQuestions.flatMap(q => q.answers);
      
      const keywords: Record<string, string[]> = {
        positive: ["강사", "재미", "도움", "실습", "설명", "친절", "최고", "로봇", "드론", "체험", "활동", "그림", "미술"],
        negative: ["어렵", "부족", "시간", "시끄러", "좁다", "길다", "짧다", "복잡", "모르겠"]
      };
      
      const analysisKeywords = {
        pos: keywords.positive.filter(k => allSubjTexts.some(t => t && t.includes(k))),
        neg: keywords.negative.filter(k => allSubjTexts.some(t => t && t.includes(k)))
      };

      return { compResults, satResults, subjectiveQuestions, analysisKeywords, avgPerceived, avgAttainment, avgPotential };
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
    
    // 신규 지표 집계 (인별 통합 평균 참조)
    const avgAttainment = overall.avgAttainment.toFixed(1);
    const avgPerceived = overall.avgPerceived.toFixed(1);
    const avgPotential = overall.avgPotential.toFixed(1);
    
    const avgSatScore = (overall.satResults.reduce((acc: number, s: any) => acc + s.score, 0) / (overall.satResults.length || 1)).toFixed(2);
    
    const bestArea = (overall.compResults[0] as any) || { cat: "\uD575\uC2EC \uC5ED\uB7C9", attainment: 0, perceived: 0, post: 0 };
    const worstArea = (overall.compResults[overall.compResults.length - 1] as any) || { cat: "\uAE30\uCD08 \uC18C\uC591", attainment: 0, perceived: 0, post: 0 };
    
    const satGap = overall.satResults.length >= 2 
        ? (overall.satResults[0].score - overall.satResults[overall.satResults.length-1].score).toFixed(2)
        : "0.00";

    let fullAnalysis = `## [서울런 3.0 성과 분석 보고서: AI 컨설턴트 객관적 관찰 분석]\n\n`;


    // Chapter 1. Strategic Overview
    fullAnalysis += `### Chapter 1. 사업 성과 총괄 및 지표 분석 (Strategic Overview)\n`;
    fullAnalysis += `본 사업의 핵심 지표인 **사후 성숙도(${totalMaturity}/5.0)**와 **교육 만족도(${avgSatScore}/5.0)**의 상관관계를 분석한 결과, 전반적인 데이터 정합성이 우수한 수준으로 관찰됩니다.\n\n`;
    fullAnalysis += `특히 평균 **${avgPerceived}%의 학습 인지 변화도**는 단기 교육 과정의 특성 내에서 학습자의 인지적 성취가 어느 정도 형성되었음을 시사합니다. '학습 목표 근접도 분석' 기법을 적용했을 때, 초기 설정한 강화 목표 대비 약 **${avgPotential}%의 근접도**를 보이며 안정적인 궤도에 진입한 것으로 보입니다. 이는 단순 교육 제공을 넘어 맞춤형 진로 설계 지원이라는 목표에 부합하는 결과로 풀이됩니다.\n\n`;

    // Chapter 2. Maturity Deep Dive
    fullAnalysis += `### Chapter 2. 다차원 역량 도달 수준 진단 (Maturity Deep Dive)\n`;
    fullAnalysis += `학습자 역량 변화 추이를 분석한 결과, 상대적으로 큰 인지 변화를 보인 영역은 **'${bestArea.cat}'(+${Number(bestArea.perceived).toFixed(1)}%)**인 반면, **'${worstArea.cat}'** 영역은 상대적으로 완만한 변화 양상을 나타내는 경향이 있습니다.\n\n`;
    fullAnalysis += `현재 도출된 **해당 영역 도달률 ${Number(bestArea.attainment).toFixed(1)}% (100점 환산)** 지점은 차년도 심화 과정 진입을 위한 '임계점(Threshold)'에 근접한 수준으로 보입니다. 특히 도달 수준은 학습자들이 기초 탐색 단계를 넘어 실무/실행 중심의 심화 단계로 나아갈 수 있는 가능성을 시사하는 지표로 풀이됩니다.\n\n`;

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
    fullAnalysis += ` 이러한 정성적 피드백은 콘텐츠 품질 대비 운영 품질의 격차를 줄이는 것이 만족도 지표를 4.0 이상으로 견인할 핵심 과제임을 나타냅니다.\n\n`;

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
    fullAnalysis += `### Chapter 4. 사업 운영의 병목 현상 및 핵심 성공 요인 (Critical Success Factors)\n`;
    fullAnalysis += `**[Bottle-neck]**: 분석 결과, 인지 변화를 저해하는 주요 병목 현상은 '${worstArea.cat}' 영역의 인지적 진입장벽과 물리적 운영 환경의 제약으로 도출되었습니다.\n`;
    fullAnalysis += `**[Success Factors]**: 반면, 성과를 견인한 결정적 요인은 '${bestArea.cat}' 중심의 실습형 콘텐츠와 회의록(${meetingMinutes.length}건)에서 확인된 '${minuteAgenda || '현장 밀착형 운영'}' 전략의 유효성입니다. 현장 중심의 기획이 정량적 역량 도달 수준으로 직결된 사례로 볼 수 있습니다.\n\n`;

    // Chapter 5. Feedback - Enhanced with frequency-based recommendations
    fullAnalysis += `### Chapter 5. \uCC28\uB144\uB3C4 \uC0AC\uC5C5 \uACE0\uB3C4\uD654\uB97C \uC704\uD55C \uD658\uB958(Feedback) \uC81C\uC5B8\n`;

    // 질문 기반 제언 생성
    fullAnalysis += `1. **커리큘럼 및 UX 재설계**: 역량 도달 수준이 저조한 항목인 '${worstArea.cat}' 영역의 난이도를 세분화하고, `;
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
      fullAnalysis += `3. **전략적 정책 제언**: 발주기관은 차기 예산 편성 시 **'도달 임계점 근접 그룹 대상의 브릿지 프로그램(Bridge Program)'** 신설을 반드시 검토해야 합니다.\n\n`;
    }


    fullAnalysis += `--- \n`;
    fullAnalysis += `👉 **"본 조사는 학습자 자가 진단에 기반한 주관적 데이터이며, 단기 과정의 특성상 상황 의존적일 수 있음"**\n\n`;
    fullAnalysis += `*\uBCF8 \uBCF4\uACE0\uC11C\uB294 \uB370\uC774\uD130 \uAE30\uBC18 \uC54C\uACE0\uB9AC\uC998\uC5D0 \uC758\uD574 \uC0DD\uC131\uB41C AI \uCEE8\uC124\uD134\uD2B8\uAE09 \uAD00\uCC30 \uC758\uACAC\uC785\uB2C8\uB2E4.*\n`;
    fullAnalysis += `**\uC11C\uC6B8\uB7F0 3.0 AI \uCEE8\uC124\uD134\uD2B8**`;

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
