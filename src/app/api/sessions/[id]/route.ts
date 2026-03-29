import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function renumberSessions(programId: string) {
  const allSessions = await prisma.programSession.findMany({
    where: { programId },
    orderBy: [
      { date: "asc" },
      { startTime: "asc" }
    ]
  });

  for (let i = 0; i < allSessions.length; i++) {
    await prisma.programSession.update({
      where: { id: allSessions[i].id },
      data: { sessionNumber: i + 1 }
    });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { partnerId, date, startTime, endTime, courseName, instructorName, capacity, participantCount } = body;

    const existingSession = await prisma.programSession.findUnique({
      where: { id }
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const updatedSession = await prisma.programSession.update({
      where: { id },
      data: {
        partnerId,
        date: date ? new Date(date) : undefined,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        courseName,
        instructorName,
        capacity: capacity ? Number(capacity) : undefined,
        participantCount: participantCount !== undefined ? Number(participantCount) : undefined
      }
    });

    // If date or startTime changed, re-number
    if (date || startTime) {
      await renumberSessions(existingSession.programId);
    }

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const existingSession = await prisma.programSession.findUnique({
      where: { id }
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const programId = existingSession.programId;

    await prisma.programSession.delete({
      where: { id }
    });

    // Re-number after delete
    await renumberSessions(programId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
