const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function test() {
  const lines = [];
  const log = (msg) => lines.push(msg);

  const now = new Date();
  const kstMs = now.getTime() + (9 * 3600000);
  const kstDate = new Date(kstMs);
  const todayYear = kstDate.getUTCFullYear();
  const todayMonth = kstDate.getUTCMonth();
  const todayDay = kstDate.getUTCDate();
  const todayDow = kstDate.getUTCDay();

  const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
  const thisMondayMs = Date.UTC(todayYear, todayMonth, todayDay + mondayOffset);

  const makeWeekRange = (mondayMs) => ({
    start: new Date(mondayMs),
    end: new Date(mondayMs + 6 * 86400000 + 86400000 - 1)
  });

  const twoWeeksAgo = makeWeekRange(thisMondayMs - 14 * 86400000);
  const lastWeek = makeWeekRange(thisMondayMs - 7 * 86400000);
  const thisWeek = makeWeekRange(thisMondayMs);
  const nextWeek = makeWeekRange(thisMondayMs + 7 * 86400000);

  log('now: ' + now.toISOString());
  log('KST date: ' + todayYear + '-' + (todayMonth+1) + '-' + todayDay + ' (dow=' + todayDow + ')');
  log('');
  log('=== Expected (KST view) ===');
  log('2026-04-06 is Monday => thisWeek = 4/6(Mon)~4/12(Sun)');
  log('');
  log('=== Actual Ranges (UTC) ===');
  log('2weeksAgo: ' + twoWeeksAgo.start.toISOString() + ' ~ ' + twoWeeksAgo.end.toISOString());
  log('lastWeek:  ' + lastWeek.start.toISOString() + ' ~ ' + lastWeek.end.toISOString());
  log('thisWeek:  ' + thisWeek.start.toISOString() + ' ~ ' + thisWeek.end.toISOString());
  log('nextWeek:  ' + nextWeek.start.toISOString() + ' ~ ' + nextWeek.end.toISOString());

  // DB sessions with matching
  const allSessions = await prisma.programSession.findMany({
    include: { program: { select: { name: true, order: true } } },
    orderBy: { date: 'asc' }
  });
  const allMeetings = await prisma.meetingMinute.findMany({ orderBy: { date: 'asc' } });

  const classify = (dateMs) => {
    if (dateMs >= twoWeeksAgo.start.getTime() && dateMs <= twoWeeksAgo.end.getTime()) return '2weeksAgo';
    if (dateMs >= lastWeek.start.getTime() && dateMs <= lastWeek.end.getTime()) return 'lastWeek';
    if (dateMs >= thisWeek.start.getTime() && dateMs <= thisWeek.end.getTime()) return 'thisWeek';
    if (dateMs >= nextWeek.start.getTime() && dateMs <= nextWeek.end.getTime()) return 'nextWeek';
    return 'NONE';
  };

  log('');
  log('=== Sessions Classification ===');
  for (const s of allSessions) {
    const cat = classify(s.date.getTime());
    log(s.date.toISOString() + ' | ' + (s.program ? s.program.order + '.' + s.program.name : 'N/A') + ' | #' + s.sessionNumber + ' => ' + cat);
  }

  log('');
  log('=== Meetings Classification ===');
  for (const m of allMeetings) {
    const cat = classify(m.date.getTime());
    log(m.date.toISOString() + ' | ' + m.title.substring(0, 40) + ' => ' + cat);
  }

  fs.writeFileSync('debug_result2.txt', lines.join('\n'), 'utf8');
  console.log('Done - see debug_result2.txt');
}

test().catch(console.error).finally(() => prisma.$disconnect());
