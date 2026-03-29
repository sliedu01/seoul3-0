const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data with updated schema...');

  // 1. Partners
  const partners = await Promise.all([
    prisma.partner.create({ data: { name: '(주)에듀테크 파트너스', contactName: '김철수', contactPhone: '010-1111-2222', contactEmail: 'cs.kim@edutech.com', address: '서울시 중구', businessRegistration: 'BR-001.pdf', contractFile: 'CT-001.pdf', insuranceFile: 'IS-001.pdf' } }),
    prisma.partner.create({ data: { name: '미래창의재단', contactName: '이영희', contactPhone: '010-2222-3333', contactEmail: 'yh.lee@future.org', address: '서울시 강남구', businessRegistration: 'BR-002.pdf', contractFile: 'CT-002.pdf', insuranceFile: 'IS-002.pdf' } }),
    prisma.partner.create({ data: { name: 'AI학습통합연구소', contactName: '박지성', contactPhone: '010-3333-4444', contactEmail: 'js.park@ailab.kr', address: '서울시 서초구', businessRegistration: 'BR-003.pdf', contractFile: 'CT-003.pdf', insuranceFile: 'IS-003.pdf' } }),
  ]);

  // 2. Programs
  const programNames = ['진로캠퍼스', 'STEM프리스쿨', '생성형 AI 캠프', '코딩 마스터 클래스', '찾아가는 진로박람회'];
  const programs = await Promise.all(programNames.map(name => 
    prisma.program.create({
      data: {
        name,
        description: `${name} 고도화 프로그램입니다.`,
        coreGoals: '역량 강화'
      }
    })
  ));

  // 3. Question Template & Questions
  const template = await prisma.questionTemplate.create({
    data: {
      name: '서울 3.0 표준 역량 평가',
      type: 'DIGITAL',
      scope: 'ALL',
      questions: {
        create: [
          { category: '자기 이해', type: 'CHOICE', content: '나의 적성과 흥미를 잘 알고 있다.', order: 1 },
          { category: '자기 이해', type: 'CHOICE', content: '나의 강점을 활용할 방법을 알고 있다.', order: 2 },
          { category: '진로 설계', type: 'CHOICE', content: '나의 미래에 대한 구체적인 계획이 있다.', order: 3 },
          { category: '진로 설계', type: 'CHOICE', content: '목표 달성을 위해 필요한 활동을 알고 있다.', order: 4 },
        ]
      }
    },
    include: { questions: true }
  });

  // 4. Sessions & Responses
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const program = programs[i % programs.length];
    const partner = partners[i % partners.length];
    const sessionDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 3));

    const session = await prisma.programSession.create({
      data: {
        programId: program.id,
        partnerId: partner.id,
        sessionNumber: (i % 2) + 1,
        date: sessionDate
      }
    });

    // Responses for each session
    for (let r = 0; r < 15; r++) {
      const respondentId = `STU-${i}-${r}`;
      
      // PRE Survey
      const preResponse = await prisma.surveyResponse.create({
        data: {
          programSessionId: session.id,
          respondentId,
          type: 'PRE'
        }
      });
      for (const q of template.questions) {
        await prisma.answer.create({
          data: {
            responseId: preResponse.id,
            questionId: q.id,
            score: Math.floor(2 + Math.random() * 2)
          }
        });
      }

      // POST Survey
      const postResponse = await prisma.surveyResponse.create({
        data: {
          programSessionId: session.id,
          respondentId,
          type: 'POST'
        }
      });
      for (const q of template.questions) {
        await prisma.answer.create({
          data: {
            responseId: postResponse.id,
            questionId: q.id,
            score: Math.floor(3.5 + Math.random() * 1.5)
          }
        });
      }

      // SATISFACTION (optional, but let's add)
      const satResponse = await prisma.surveyResponse.create({
        data: {
          programSessionId: session.id,
          respondentId,
          type: 'SATISFACTION'
        }
      });
      await prisma.answer.create({
        data: {
          responseId: satResponse.id,
          questionId: template.questions[0].id,
          score: Math.floor(4 + Math.random() * 1)
        }
      });
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
