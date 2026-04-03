import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { date, startTime, endTime, title, capacity, participantCount } = body;

    const existing = await prisma.classDay.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "ClassDay not found" }, { status: 404 });
    }

    const updated = await prisma.classDay.update({
      where: { id },
      data: {
        date: date ? new Date(date) : undefined,
        startTime: startTime !== undefined ? (startTime ? new Date(startTime) : null) : undefined,
        endTime: endTime !== undefined ? (endTime ? new Date(endTime) : null) : undefined,
        title: title !== undefined ? title : undefined,
        capacity: capacity !== undefined ? Number(capacity) : undefined,
        participantCount: participantCount !== undefined ? Number(participantCount) : undefined
      }
    });

    // Update session aggregates
    await updateSessionAggregates(existing.programSessionId);

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update class day" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const existing = await prisma.classDay.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "ClassDay not found" }, { status: 404 });
    }

    const sessionId = existing.programSessionId;

    await prisma.classDay.delete({ where: { id } });

    // Update session aggregates
    await updateSessionAggregates(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete class day" }, { status: 500 });
  }
}

async function updateSessionAggregates(sessionId: string) {
  const aggregates = await prisma.classDay.aggregate({
    where: { programSessionId: sessionId },
    _sum: { capacity: true, participantCount: true }
  });

  const classDays = await prisma.classDay.findMany({
    where: { programSessionId: sessionId },
    orderBy: { date: "asc" }
  });

  const updateData: any = {
    capacity: aggregates._sum.capacity ?? 0,
    participantCount: aggregates._sum.participantCount ?? 0
  };

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
