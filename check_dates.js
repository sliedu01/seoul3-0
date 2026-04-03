const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const programs = await prisma.program.findMany({
    include: {
      sessions: {
        include: { partner: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: 5
      }
    },
    orderBy: { order: 'asc' },
    take: 1
  });

  let output = '';
  if (programs.length > 0) {
    const p = programs[0];
    output += 'PROGRAM: ' + p.name + '\n\n';
    p.sessions.forEach((s, i) => {
      output += 'Session ' + (i+1) + ': ' + (s.courseName || 'N/A') + '\n';
      output += '  date_iso     = ' + (s.date ? s.date.toISOString() : 'null') + '\n';
      output += '  startTime_iso= ' + (s.startTime ? s.startTime.toISOString() : 'null') + '\n';
      output += '  endTime_iso  = ' + (s.endTime ? s.endTime.toISOString() : 'null') + '\n';
      output += '\n';
    });
  }
  fs.writeFileSync('date_check_result.txt', output, 'utf8');
  console.log('Done. See date_check_result.txt');
}

main().catch(console.error).finally(() => prisma.$disconnect());
