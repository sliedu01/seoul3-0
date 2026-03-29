const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

const programContexts = {
  "진로캠퍼스": {
    description: "청소년 주도형 진로 설계 및 자기이해 기반 커리어 로드맵 구축 프로그램",
    coreGoals: "자기이해 심화, 진로 정보 탐색 역량 강화, 주도적 진로 결정력 배양",
    subj: {
      pos: ["자신에 대해 깊이 있게 알게 되어 좋았습니다.", "강사님이 친절하게 설명해주셔서 진로 결정에 큰 도움이 됐어요.", "친구들과 함께 진로 로드맵을 그려보는 활동이 기억에 남습니다."],
      neu: ["내용은 유익했으나 시간이 조금 짧았던 것 같습니다.", "무난한 프로그램이었고, 정보 탐색 방법은 어느 정도 배운 것 같아요.", "평소 알던 내용이 많았지만 복습하는 차원에서 괜찮았습니다."],
      neg: ["생각보다 어려운 용어가 많아서 이해하기 힘들었습니다.", "활동지 작성이 너무 많아서 지루한 면이 있었어요.", "기대했던 것과는 조금 다른 방향의 수업이었습니다."]
    }
  },
  "STEM프리스쿨": {
    description: "놀이 중심의 과학·기술·공학·수학 융합 교육을 통한 미래 창의 인재 양성",
    coreGoals: "STEM 흥미 유발, 문제 해결 능력 향상, 창의적 사고력 증진",
    subj: {
      pos: ["직접 로봇을 조립하고 코딩해보는 과정이 정말 신기하고 재미있었어요.", "과학 원리를 실험으로 배우니 이해가 쏙쏙 됐습니다.", "내가 만든 작품이 실제로 작동하는 걸 보고 뿌듯했습니다."],
      neu: ["교구 상태는 좋았지만 사용법 설명이 더 자세했으면 좋겠어요.", "재미는 있었는데 난이도가 어린 나이의 아이들에게는 조금 높을 수도 있겠네요.", "창의력을 발휘할 시간이 더 많았으면 좋겠습니다."],
      neg: ["일부 교구가 제대로 작동하지 않아 흐름이 끊겼습니다.", "선생님 한 분이 너무 많은 학생을 담당하시느라 개별 지도가 부족했어요.", "기초적인 내용만 다루어서 조금 아쉬웠습니다."]
    }
  },
  "조금느린아이": {
    description: "학습 및 사회성 발달이 느린 아동을 위한 맞춤형 인지·정서 통합 지원 프로그램",
    coreGoals: "기초 학습 역량 강화, 자아존중감 향상, 사회적 상호작용 능력 개선",
    subj: {
      pos: ["아이의 눈높이에 맞춘 세심한 지도가 정말 인상적이었습니다.", "프로그램 이후 아이가 친구들에게 먼저 말을 거는 등 자신감이 생겼어요.", "그림을 그리며 마음을 표현하는 수업이 아이에게 큰 위로가 된 것 같습니다."],
      neu: ["장기적인 관리가 필요해 보이는데, 단발성 수업이라 효과가 지속될지 모르겠어요.", "전반적으로 만족하지만, 부모 상담 시간이 조금 더 늘어났으면 합니다.", "아이들이 집중할 수 있는 환경은 잘 갖춰진 것 같아요."],
      neg: ["우리 아이의 특성을 충분히 반영하지 못한 것 같아 아쉽습니다.", "장소가 협소하여 아이들이 활동하기에 다소 불편해 보였습니다.", "일부 시간표가 너무 빡빡해서 아이가 힘들어했어요."]
    }
  },
  "생성형 AI 서비스 도입·제공": {
    description: "최신 AI 기술을 활용한 업무 효율화 및 창의적 콘텐츠 제작 실습",
    coreGoals: "생성형 AI 도구 숙달, 프롬프트 엔지니어링 역량 확보, AI 윤리 의식 고취",
    subj: {
      pos: ["프롬프트를 어떻게 작성하느냐에 따라 결과가 달라지는 게 놀랍습니다.", "실제로 실무에 활용할 수 있는 팁을 많이 얻어 유익했어요.", "어렵게만 느껴졌던 AI가 친숙하게 느껴지는 시간이었습니다."],
      neu: ["이론보다는 실습 시간이 조금 더 많았으면 좋겠습니다.", "다양한 도구를 소개해주셨는데, 한 가지를 깊게 배우고 싶기도 해요.", "전반적으로 최신 트렌드를 잘 짚어주신 것 같습니다."],
      neg: ["인터넷 환경이 불안정해서 실습 도중 자꾸 끊겨서 불편했습니다.", "AI 윤리에 대한 내용이 조금 더 보완되면 좋겠네요.", "기존에 알던 내용과 크게 다르지 않아서 아쉬웠습니다."]
    }
  },
  "화상영어": {
    description: "원어민 강사와의 실시간 소통을 통한 실전 영어 회화 능력 및 자신감 향상",
    coreGoals: "의사소통 능력 강화, 영어 학습 동기 부여, 글로벌 에티켓 습득",
    subj: {
      pos: ["외국인 선생님과 직접 대화하니 자신감이 많이 생겼습니다.", "교재 구성이 재미있고 강사님의 리액션이 좋아서 몰입이 잘 됐어요.", "시간과 장소 구애 없이 원어민과 만날 수 있어 매우 효율적입니다."],
      neu: ["강사님마다 실력이 조금씩 차이가 나는 것 같아 아쉬움이 있습니다.", "연결 끊김 현상이 가끔 있었지만 수업을 진행하는 데는 큰 지장 없었어요.", "교재 난이도가 제 실력에는 중간 정도였습니다."],
      neg: ["강사님의 발음이 알아듣기 조금 어려웠고 설명이 부족했습니다.", "예약 시스템이 다소 불편해서 신청하는 데 애를 먹었어요.", "수업 시간이 너무 짧아서 깊이 있는 대화를 나누기 어려웠습니다."]
    }
  },
  "영어캠프": {
    description: "방학 중 몰입형 영어 환경 제공을 통한 단기 언어 역량 강화 및 세계시민 의식 함양",
    coreGoals: "영어 유창성 확보, 문화 다양성 이해, 공동체 의식 형성",
    subj: {
      pos: ["또래 친구들과 영어로만 생활하며 잊지 못할 추억을 만들었습니다.", "다양한 국가의 문화를 간접 체험할 수 있는 활동이 정말 좋았어요.", "영어가 공부가 아닌 소통의 도구라는 것을 깨닫게 된 캠프였습니다."],
      neu: ["식사 메뉴가 아이들 입맛에 조금 더 다양했으면 하는 바람이 있습니다.", "기숙사 시설은 깨끗했으나 휴식 시간이 조금 더 보장되었으면 해요.", "프로그램 중간중간 대기 시간이 조금 길게 느껴졌습니다."],
      neg: ["영어가 익숙하지 않은 아이들에게는 캠프 환경이 다소 주눅 들게 했습니다.", "선생님들의 관리가 철저하지 못한 면이 있어 일부 아이들이 소외되는 느낌이었어요.", "비용 대비 프로그램 구성이 아주 알차지는 않은 것 같습니다."]
    }
  }
};

const defaultContext = {
  description: "미래 인재 양성을 위한 서울형 맞춤형 교육 프로그램",
  coreGoals: "미래 역량 강화, 창의적 문제 해결, 공동체 의식 함양",
  subj: {
    pos: ["수업 내용이 매우 유익하고 즐거웠습니다.", "많은 것을 배울 수 있는 소중한 시간이었습니다.", "강사님이 매우 열정적이어서 좋았습니다."],
    neu: ["무난하고 적절한 프로그램이었습니다.", "더 나은 환경이 갖춰지면 좋겠지만 지금도 괜찮습니다.", "내용 전달은 잘 되었습니다."],
    neg: ["기대에 비해 내용이 조금 아쉬웠습니다.", "운영적인 측면에서 보완이 필요해 보입니다.", "시간 배분이 조금 균형적이지 못했습니다."]
  }
};

function getRandomByDist() {
  const rand = Math.random() * 100;
  if (rand < 60) return Math.floor(4 + Math.random() * 2); // 4-5
  if (rand < 90) return 3; // 3
  return Math.floor(1 + Math.random() * 2); // 1-2
}

function getSubjectiveByDist(context) {
  const rand = Math.random() * 100;
  let pool;
  if (rand < 60) pool = context.subj.pos;
  else if (rand < 90) pool = context.subj.neu;
  else pool = context.subj.neg;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function main() {
  console.log('Starting Fancy Reseed with context and weighted distribution (60/30/10)...');

  // 1. Clean up
  await prisma.answer.deleteMany({});
  await prisma.surveyResponse.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.questionTemplate.deleteMany({});

  // 2. Fetch or Update Programs
  const allPrograms = await prisma.program.findMany();
  for (const p of allPrograms) {
    const ctx = programContexts[p.name] || defaultContext;
    await prisma.program.update({
      where: { id: p.id },
      data: { 
        description: ctx.description,
        coreGoals: ctx.coreGoals
      }
    });
  }

  // 3. Topics
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

  // 4. Create Template
  const template = await prisma.questionTemplate.create({
    data: {
      name: '서울런3.0 성과 분석 표준 설문 v2',
      type: 'DIGITAL',
      scope: 'ALL',
      questions: {
        create: [
          ...compTopics.map((item, idx) => ({ category: item.topic, type: 'CHOICE', content: item.q, order: idx + 1 })),
          ...satTopics.map((item, idx) => ({ category: item.topic, type: 'SATISFACTION', content: item.q, order: idx + 7 })),
          { category: "주관식", type: "SUBJECTIVE", content: "프로그램에서 가장 기억에 남는 것은 무엇인가요?", order: 13 },
          { category: "주관식", type: "SUBJECTIVE", content: "향후 참여하고 싶은 프로그램이 있다면 적어주세요.", order: 14 }
        ]
      }
    },
    include: { questions: true }
  });

  const partners = await prisma.partner.findMany({ take: 3 });

  // 5. Create Responses
  for (const program of allPrograms) {
    const context = programContexts[program.name] || defaultContext;
    const partner = partners[Math.floor(Math.random() * partners.length)] || { id: null };
    
    console.log(`Creating session and 20 responses for [${program.name}]...`);

    const session = await prisma.programSession.create({
      data: {
        programId: program.id,
        partnerId: partner.id,
        sessionNumber: 1,
        date: new Date(),
        courseName: `${program.name} 핵심 과정`,
        instructorName: "성결 강사"
      }
    });

    for (let r = 0; r < 20; r++) {
      const rid = `USER-${program.name.slice(0,2)}-${r}`;
      const pre = await prisma.surveyResponse.create({ data: { programSessionId: session.id, respondentId: rid, type: 'PRE' } });
      const post = await prisma.surveyResponse.create({ data: { programSessionId: session.id, respondentId: rid, type: 'POST' } });
      const sat = await prisma.surveyResponse.create({ data: { programSessionId: session.id, respondentId: rid, type: 'SATISFACTION' } });

      for (const q of template.questions) {
        if (q.type === 'CHOICE') {
          // Pre/Post Competency
          const score = getRandomByDist();
          const preScore = Math.max(1, score - (Math.random() > 0.3 ? 1 : 0)); // Pre slightly lower
          const postScore = score;
          
          await prisma.answer.create({ data: { responseId: pre.id, questionId: q.id, score: preScore, preScore: preScore } });
          await prisma.answer.create({ data: { responseId: post.id, questionId: q.id, score: postScore, preScore: preScore, postChange: postScore - preScore } });
        } else if (q.type === 'SATISFACTION') {
          await prisma.answer.create({ data: { responseId: sat.id, questionId: q.id, score: getRandomByDist() } });
        } else if (q.type === 'SUBJECTIVE') {
          await prisma.answer.create({ data: { responseId: sat.id, questionId: q.id, text: getSubjectiveByDist(context) } });
        }
      }
    }
  }

  console.log('Fancy Seeding completed successfully!');
}

main().finally(() => prisma.$disconnect());
