const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log("Seeding test data...")

  // 1. Get or create a program
  let program = await prisma.program.findFirst({ where: { name: "서울 미래교육 3.0" } })
  if (!program) {
    program = await prisma.program.create({
      data: {
        name: "서울 미래교육 3.0",
        description: "미래 인재 양성을 위한 서울형 교육 프로그램"
      }
    })
  }

  // 2. Get or create partners
  const partnersData = ["미래인재연구소", "창의교육그룹", "글로벌테크"]
  const partners = []
  for (const name of partnersData) {
    let p = await prisma.partner.findFirst({ where: { name } })
    if (!p) {
      p = await prisma.partner.create({ data: { name } })
    }
    partners.push(p)
  }

  // 3. Get or create a template
  let template = await prisma.questionTemplate.findFirst({ where: { name: "기본 역량 및 만족도 조사" } })
  if (!template) {
    template = await prisma.questionTemplate.create({
      data: {
        name: "기본 역량 및 만족도 조사",
        type: "PRE_POST",
        scope: "STUDENT",
        programId: program.id,
        questions: {
          create: [
            // Competency Questions (0-4)
            { category: "competency", type: "COMBO_PRE_POST", content: "디지털 도구 활용 능력", order: 0 },
            { category: "competency", type: "COMBO_PRE_POST", content: "문제 해결 역량", order: 1 },
            { category: "competency", type: "COMBO_PRE_POST", content: "협업 능력", order: 2 },
            { category: "competency", type: "COMBO_PRE_POST", content: "창의적 사고", order: 3 },
            { category: "competency", type: "COMBO_PRE_POST", content: "자기 주도 학습", order: 4 },
            // Satisfaction Questions (0-4)
            { category: "satisfaction", type: "SATISFACTION", content: "교육 내용의 유익성", order: 0 },
            { category: "satisfaction", type: "SATISFACTION", content: "강사 전달력", order: 1 },
            { category: "satisfaction", type: "SATISFACTION", content: "교구 및 시설 만족도", order: 2 },
            { category: "satisfaction", type: "SATISFACTION", content: "시간 배분의 적절성", order: 3 },
            { category: "satisfaction", type: "SATISFACTION", content: "전반적 만족도", order: 4 },
            // Subjective
            { category: "satisfaction", type: "SUBJECTIVE", content: "기억에 남는 활동", order: 5 },
            { category: "satisfaction", type: "SUBJECTIVE", content: "향후 희망 프로그램", order: 6 },
          ]
        }
      },
      include: { questions: true }
    })
  } else {
    template = await prisma.questionTemplate.findUnique({ 
        where: { id: template.id }, 
        include: { questions: true } 
    })
  }

  // 4. Create sample sessions if not exist
  const sessions = []
  for (let i = 1; i <= 3; i++) {
    const partner = partners[i % partners.length]
    let s = await prisma.programSession.findFirst({ 
        where: { programId: program.id, partnerId: partner.id, sessionNumber: i } 
    })
    if (!s) {
      s = await prisma.programSession.create({
        data: {
          programId: program.id,
          partnerId: partner.id,
          sessionNumber: i,
          date: new Date(2024, 2, 11 + i), // March 12, 13, 14
          courseName: `인공지능과 미래 사회 ${i}`,
          instructorName: `강사${i}`,
        }
      })
    }
    sessions.push(s)
  }

  // 5. Create Survey Responses
  for (const session of sessions) {
    console.log(`Creating responses for session ${session.sessionNumber}...`)
    for (let j = 1; j <= 10; j++) {
      await prisma.surveyResponse.create({
        data: {
          programSessionId: session.id,
          templateId: template.id,
          respondentId: `S${session.sessionNumber}-${1000 + j}`,
          researchTarget: j % 3 === 0 ? "high" : j % 3 === 1 ? "elementary" : "middle",
          type: "NORMAL",
          answers: {
            create: template.questions.map(q => {
              if (q.category === "competency") {
                const pre = Math.floor(Math.random() * 3) + 1
                const change = Math.floor(Math.random() * 2) // 0 or 1
                return {
                  questionId: q.id,
                  preScore: pre,
                  postChange: change,
                  score: pre + change
                }
              } else if (q.type === "SATISFACTION") {
                return {
                  questionId: q.id,
                  score: Math.floor(Math.random() * 2) + 4 // 4 or 5
                }
              } else {
                return {
                  questionId: q.id,
                  text: q.content.includes("기억") ? "로봇 실습이 재미있었습니다." : "AI 코딩 실습 더 하고 싶어요."
                }
              }
            })
          }
        }
      })
    }
  }

  console.log("Seeding completed successfully.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
