const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const template = await prisma.questionTemplate.findUnique({
        where: { id: 'cmnxx4zce0001ju04x2is8x36' },
        include: { questions: true }
    });
    console.log(JSON.stringify(template, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
