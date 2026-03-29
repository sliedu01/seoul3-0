const { PrismaClient } = require("./src/generated/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const partners = await prisma.partner.findMany({
      include: {
        sessions: {
          select: { programId: true, date: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    console.log("Partners Found:", JSON.stringify(partners, null, 2));
  } catch (error) {
    console.error("Prisma Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
