const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const sessions = await prisma.programSession.findMany({
        where: {
            date: {
                gte: new Date('2026-03-20T00:00:00.000Z'),
                lte: new Date('2026-03-22T00:00:00.000Z'),
            },
        },
        include: {
            program: true,
            partner: true,
            responses: {
                include: {
                    answers: true
                }
            }
        }
    });

    console.log(JSON.stringify(sessions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
