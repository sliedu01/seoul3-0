const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const responses = await prisma.surveyResponse.findMany({
    where: {
      session: {
        program: { name: { contains: "진로캠퍼스" } },
        partner: { name: { contains: "노원" } },
        sessionNumber: 1
      }
    },
    include: {
      answers: {
        include: { question: true }
      }
    }
  });

  console.log(`Found ${responses.length} responses.`);
  if (responses.length > 0) {
    const r = responses[0];
    console.log("Answers for the first response:");
    r.answers.forEach(a => {
      console.log(`Q: ${a.question.content}, Category: ${a.question.category}, Score: ${a.score}, PreScore: ${a.preScore}, PostChange: ${a.postChange}`);
    });
  }
}
check();
