const { PrismaClient } = require('./src/generated/client');
const p = new PrismaClient();

async function main() {
  // Find answers with text (subjective answers)
  const answers = await p.answer.findMany({
    where: { text: { not: null } },
    include: { question: true },
    take: 30
  });
  
  console.log('=== Subjective Answers (text != null) ===');
  console.log('Total found:', answers.length);
  answers.forEach(a => {
    console.log(JSON.stringify({
      qCategory: a.question.category,
      qContent: a.question.content.substring(0, 60),
      qType: a.question.type,
      qGrowthType: a.question.growthType,
      text: (a.text || '').substring(0, 80),
      score: a.score,
      preScore: a.preScore
    }));
  });

  // Also check what categories exist in questions
  const questions = await p.question.findMany({
    select: { category: true, content: true, type: true, growthType: true },
    distinct: ['category']
  });
  console.log('\n=== Distinct Question Categories ===');
  questions.forEach(q => {
    console.log(JSON.stringify({
      category: q.category,
      content: q.content.substring(0, 50),
      type: q.type,
      growthType: q.growthType
    }));
  });

  // Check subjective-type questions specifically 
  const subjectiveQs = await p.question.findMany({
    where: {
      OR: [
        { content: { contains: '적어주세요' } },
        { content: { contains: '의견' } },
        { content: { contains: '기억에 남는' } },
        { content: { contains: '개선' } },
        { content: { contains: '건의' } },
        { content: { contains: '바라는' } },
        { content: { contains: '희망' } }
      ]
    }
  });
  console.log('\n=== Subjective Questions ===');
  subjectiveQs.forEach(q => {
    console.log(JSON.stringify({
      id: q.id,
      category: q.category,
      content: q.content,
      type: q.type,
      growthType: q.growthType
    }));
  });

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
