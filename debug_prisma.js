const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const partners = await prisma.partner.findMany();
    console.log('SUCCESS: fetched ' + partners.length + ' partners');
    console.log(JSON.stringify(partners[0] || 'no partners yet', null, 2));
  } catch (e) {
    console.error('ERROR:');
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
