const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  try {
    const stats = {
        programs: await prisma.program.count(),
        sessions: await prisma.programSession.count(),
        templates: await prisma.questionTemplate.count(),
        responses: await prisma.surveyResponse.count(),
        answers: await prisma.answer.count(),
        documents: await prisma.surveyDocument.count()
    };
    console.log("Database Stats:", JSON.stringify(stats, null, 2));

    if (stats.responses > 0) {
        const sample = await prisma.surveyResponse.findFirst({
            include: { session: true }
        });
        console.log("Sample Response Session Date:", sample.session.date.toISOString());
        console.log("Sample Response CreatedAt:", sample.createdAt.toISOString());
    } else {
        console.log("No survey responses found in the database.");
    }

  } catch (err) {
    console.error("Diagnosis failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
