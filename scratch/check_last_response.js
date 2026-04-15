const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const lastResponse = await prisma.surveyResponse.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          include: {
            program: true,
            partner: true
          }
        }
      }
    });

    if (lastResponse) {
      console.log("Last Response Details:");
      console.log("- ID:", lastResponse.id);
      console.log("- CreatedAt:", lastResponse.createdAt.toISOString());
      console.log("- Session Date:", lastResponse.session.date.toISOString());
      console.log("- Program Name:", lastResponse.session.program.name);
      console.log("- Partner Name:", lastResponse.session.partner.name);
      console.log("- Type:", lastResponse.type);
    } else {
      console.log("No survey responses found.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
