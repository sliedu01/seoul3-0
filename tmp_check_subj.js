const { PrismaClient } = require('./src/generated/client');
const p = new PrismaClient();

async function main() {
  // 1. All ESSAY questions
  const essayQs = await p.question.findMany({
    where: { type: 'ESSAY' },
    include: { template: true }
  });
  console.log('\n=== ESSAY Questions ===');
  essayQs.forEach(q => {
    console.log(JSON.stringify({
      id: q.id, category: q.category, content: q.content,
      type: q.type, templateName: q.template.name
    }));
  });

  // 2. Sample answers for ESSAY questions
  const answers = await p.answer.findMany({
    where: { question: { type: 'ESSAY' } },
    include: { question: true },
    take: 20
  });
  console.log('\n=== Sample ESSAY Answers ===');
  answers.forEach(a => {
    console.log(JSON.stringify({
      questionContent: a.question.content,
      questionCategory: a.question.category,
      text: a.text
    }));
  });

  // 3. All subjective-like questions (containing keywords)
  const allQs = await p.question.findMany({
    where: {
      OR: [
        { type: 'ESSAY' },
        { content: { contains: '적어주세요' } },
        { content: { contains: '의견' } }
      ]
    },
    include: { template: true }
  });
  console.log('\n=== All Subjective-like Questions ===');
  allQs.forEach(q => {
    console.log(JSON.stringify({
      id: q.id, category: q.category, content: q.content,
      type: q.type, growthType: q.growthType, templateName: q.template.name
    }));
  });

  await p.$disconnect();
}
main().catch(e => { console.error(e); p.$disconnect(); });
