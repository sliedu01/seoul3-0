import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");
    const partnerId = searchParams.get("partnerId");

    const where: any = {};
    if (programId) where.programId = programId;
    if (partnerId) where.partnerId = partnerId;

    const sessions = await prisma.programSession.findMany({
      where,
      include: {
        program: true,
        partner: true
      },
      orderBy: { date: "desc" }
    });
    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { programId, partnerId, date, startTime, endTime, courseName, instructorName, capacity, participantCount } = body;
    
    // Create the session
    const newSession = await prisma.programSession.create({
      data: {
        programId,
        partnerId,
        date: new Date(date),
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        courseName,
        instructorName,
        sessionNumber: 0, // Temporary
        capacity: Number(capacity || 0),
        participantCount: Number(participantCount || 0)
      }
    });

    // Re-calculate all session numbers for this program in date + time order
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

    const session = await prisma.programSession.findUnique({
      where: { id: newSession.id },
      include: {
        program: true,
        partner: true
      }
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
