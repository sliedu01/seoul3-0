import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const classDays = await prisma.classDay.findMany({
      where: { programSessionId: sessionId },
      orderBy: [{ date: "asc" }, { startTime: "asc" }, { order: "asc" }]
    });
    return NextResponse.json(classDays);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch class days" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { programSessionId, date, startTime, endTime, title, capacity, participantCount } = body;

    if (!programSessionId || !date) {
      return NextResponse.json({ error: "programSessionId and date are required" }, { status: 400 });
    }

    // Get current max order for this session
    const maxOrder = await prisma.classDay.aggregate({
      where: { programSessionId },
      _max: { order: true }
    });

    const classDay = await prisma.classDay.create({
      data: {
        programSessionId,
        date: new Date(date),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        title: title || null,
        capacity: Number(capacity || 0),
        participantCount: Number(participantCount || 0),
        order: (maxOrder._max.order ?? 0) + 1
      }
    });

    // Update session aggregate counts from all class days
    await updateSessionAggregates(programSessionId);

    return NextResponse.json(classDay);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create class day" }, { status: 500 });
  }
}

// Helper: Update session capacity/participantCount from classDays
async function updateSessionAggregates(sessionId: string) {
  const aggregates = await prisma.classDay.aggregate({
    where: { programSessionId: sessionId },
    _sum: { capacity: true, participantCount: true }
  });

  // Also get the earliest and latest dates to update session period
  const classDays = await prisma.classDay.findMany({
    where: { programSessionId: sessionId },
    orderBy: { date: "asc" }
  });

  const updateData: any = {
    capacity: aggregates._sum.capacity ?? 0,
    participantCount: aggregates._sum.participantCount ?? 0
  };

  // Update session date range based on class days
  if (classDays.length > 0) {
    updateData.date = classDays[0].date;
    updateData.startTime = classDays[0].startTime || classDays[0].date;
    updateData.endTime = classDays[classDays.length - 1].endTime || classDays[classDays.length - 1].date;
  }

  await prisma.programSession.update({
    where: { id: sessionId },
    data: updateData
  });
}
