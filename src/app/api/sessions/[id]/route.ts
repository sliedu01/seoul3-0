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
  const { id } = await params;
  console.log(`[API] Attempting to delete session: ${id}`);
  
  try {
    const existingSession = await prisma.programSession.findUnique({
      where: { id }
    });

    if (!existingSession) {
      console.warn(`[API] Session not found for deletion: ${id}`);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const programId = existingSession.programId;

    // Use transaction if possible, or at least log progress
    console.log(`[API] Found session ${id}, deleting...`);
    await prisma.programSession.delete({
      where: { id }
    });
    console.log(`[API] Session ${id} deleted successfully. Renumbering sessions for program ${programId}...`);

    // Re-number after delete
    await renumberSessions(programId);
    console.log(`[API] Sessions renumbered for program ${programId}.`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[API] Failed to delete session ${id}:`, error);
    return NextResponse.json({ 
      error: "Failed to delete session", 
      details: error.message || String(error)
    }, { status: 500 });
  }
}
