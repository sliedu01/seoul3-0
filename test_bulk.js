const fetch = require('node-fetch');

async function test() {
  // We need real IDs from the DB. Let's fetch others first or hardcode some from seed
  // Actually, I can just use the ones I saw in debug_db.js
  const programSessionId = "cmmzjhz040003emg00p76915l"; // This is just an example, better to find one
  
  const payload = {
    sessionId: "cmmzinjzc0005emmsjez6tfdr", // Program Session ID! Wait, I need to find a real one
    templateId: "cmmzinjzc0005emmsjez6tfdr", // Template ID
    responses: [
      {
        studentName: "Test_API_Student_1",
        answers: [
          { questionId: "some_id", score: 5, textValue: "Great!" }
        ]
      }
    ]
  };

  console.log('Testing Bulk API...');
  // Let's actually find real IDs first
  const { PrismaClient } = require('./src/generated/client');
  const prisma = new PrismaClient();
  const session = await prisma.programSession.findFirst();
  const template = await prisma.questionTemplate.findFirst({
    include: { questions: true }
  });

  if (!session || !template) {
    console.error('No session or template found to test.');
    return;
  }

  const realPayload = {
    sessionId: session.id,
    templateId: template.id,
    responses: [
      {
        studentName: "Verification_Student_1",
        answers: template.questions.map(q => ({
          questionId: q.id,
          score: 5,
          textValue: "Excellent performance."
        }))
      }
    ]
  };

  try {
    const res = await fetch('http://localhost:3000/api/responses/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(realPayload)
    });
    const data = await res.json();
    console.log('Response:', data);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
