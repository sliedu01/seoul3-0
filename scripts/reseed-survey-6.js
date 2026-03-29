const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Reseeding surveys with 6 topics for maturity and 6 for satisfaction...');

  // 1. Clean up existing survey data for test purposes (optional, but cleaner)
  await prisma.answer.deleteMany({});
  await prisma.surveyResponse.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.questionTemplate.deleteMany({});

  // 2. Groups
  const compTopics = [
    { topic: "자기이해", q: "나의 적성과 강점을 명확히 알고 있다." },
    { topic: "정보탐색", q: "진로와 관련된 다양한 정보를 스스로 찾아볼 수 있다." },
    { topic: "진로결정", q: "내가 원하는 미래 모습과 직업을 결정할 수 있다." },
    { topic: "계획수립", q: "목표 달성을 위한 구체적인 학습 및 활동 계획을 세울 수 있다." },
    { topic: "문제해결", q: "진로 준비 과정에서 겪는 어려움을 스스로 극복할 수 있다." },
    { topic: "직업태도", q: "직업에 대해 긍정적이고 책임감 있는 태도를 가지고 있다." }
  ];

  const satTopics = [
    { topic: "교육내용", q: "프로그램의 구성과 내용이 유익하고 체계적이었다." },
    { topic: "강사만족", q: "강사님의 전문성과 열정, 전달력이 훌륭했다." },
    { topic: "시설환경", q: "교육 장소의 시설과 주변 환경이 쾌적하고 적절했다." },
    { topic: "운영지원", q: "프로그램 운영 및 안내 과정이 원활하고 친절했다." },
    { topic: "시간배분", q: "교육 시간과 세션별 배분이 적절하게 이루어졌다." },
    { topic: "종합만족", q: "전반적으로 이 프로그램에 대해 매우 만족한다." }
  ];

  // 3. Create Template
  const template = await prisma.questionTemplate.create({
    data: {
      name: '서울런3.0 성과 분석 표준 설문',
      type: 'DIGITAL',
      scope: 'ALL',
      questions: {
        create: [
          ...compTopics.map((item, idx) => ({
            category: item.topic,
            type: 'CHOICE',
            content: item.q,
            order: idx + 1
          })),
          ...satTopics.map((item, idx) => ({
            category: item.topic,
            type: 'SATISFACTION',
            content: item.q,
            order: idx + 7
          })),
          { category: "주관식", type: "SUBJECTIVE", content: "프로그램에서 가장 기억에 남는 것은 무엇인가요?", order: 13 },
          { category: "주관식", type: "SUBJECTIVE", content: "향후 참여하고 싶은 프로그램이 있다면 적어주세요.", order: 14 }
        ]
      }
    },
    include: { questions: true }
  });

  // 4. Create Responses for 3 Programs
  const programs = await prisma.program.findMany({ take: 3 });
  const partners = await prisma.partner.findMany({ take: 2 });

  for (const program of programs) {
    const partner = partners[Math.floor(Math.random() * partners.length)];
    
    // Create a new session
    const session = await prisma.programSession.create({
      data: {
        programId: program.id,
        partnerId: partner.id,
        sessionNumber: 1,
        date: new Date(),
        courseName: `${program.name} 1학기 과정`,
        instructorName: "김서울 강사"
      }
    });

    console.log(`Creating 20 responses for ${program.name}...`);

    for (let r = 0; r < 20; r++) {
      const rid = `USER-${program.id.slice(-4)}-${r}`;

      // PRE
      const pre = await prisma.surveyResponse.create({
        data: { programSessionId: session.id, respondentId: rid, type: 'PRE' }
      });
      // POST
      const post = await prisma.surveyResponse.create({
        data: { programSessionId: session.id, respondentId: rid, type: 'POST' }
      });
      // SATISFACTION
      const sat = await prisma.surveyResponse.create({
        data: { programSessionId: session.id, respondentId: rid, type: 'SATISFACTION' }
      });

      for (const q of template.questions) {
        if (compTopics.some(t => t.topic === q.category)) {
          // Competency Answers
          const preScore = Math.floor(2 + Math.random() * 2);
          const postScore = Math.min(5, preScore + (Math.random() > 0.2 ? 1 : 0) + Math.floor(Math.random() * 2));
          
          await prisma.answer.create({
            data: { responseId: pre.id, questionId: q.id, score: preScore, preScore: preScore }
          });
          await prisma.answer.create({
            data: { responseId: post.id, questionId: q.id, score: postScore, preScore: preScore, postChange: postScore - preScore }
          });
        } else if (satTopics.some(t => t.topic === q.category)) {
          // Satisfaction Answers
          await prisma.answer.create({
            data: { responseId: sat.id, questionId: q.id, score: Math.floor(4 + Math.random() * 2) }
          });
        } else if (q.category === "주관식") {
            await prisma.answer.create({
                data: { 
                    responseId: sat.id, 
                    questionId: q.id, 
                    text: q.content.includes("기억") ? "프로젝트 활동이 제일 재미있었습니다." : "AI 관련 특강을 더 듣고 싶어요." 
                }
            });
        }
      }
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
