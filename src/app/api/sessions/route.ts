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
        partner: true,
        classDays: {
          orderBy: [{ date: "asc" }, { startTime: "asc" }, { order: "asc" }]
        }
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
    const { 
      programId, 
      partnerId, 
      date, 
      startTime, 
      endTime, 
      courseName, 
      instructorName, 
      capacity, 
      participantCount,
      classDays // Added for bulk creation
    } = body;
    
    // Build classDays create data
    let classDaysCreate;
    if (classDays && Array.isArray(classDays) && classDays.length > 0) {
      // 사용자가 명시적으로 교육일을 지정한 경우
      classDaysCreate = {
        create: classDays.map((cd: any, idx: number) => {
          const parseDate = (val: any) => {
            if (!val) return null;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
          };
          return {
            date: parseDate(cd.date) || new Date(),
            startTime: parseDate(cd.startTime),
            endTime: parseDate(cd.endTime),
            title: cd.title,
            capacity: Number(cd.capacity || 0),
            participantCount: Number(cd.participantCount || 0),
            order: cd.order || idx
          };
        })
      };
    } else {
      // 세부 교육일이 없는 경우 → 교육과정 정보로 기본 1일차 자동 생성 보장
      classDaysCreate = {
        create: [{
          date: new Date(date),
          startTime: startTime ? new Date(startTime) : null,
          endTime: endTime ? new Date(endTime) : null,
          title: courseName || "1일차 수업",
          capacity: Number(capacity || 0),
          participantCount: Number(participantCount || 0),
          order: 0
        }]
      };
    }

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
        participantCount: Number(participantCount || 0),
        classDays: classDaysCreate
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

    const updatePromises = allSessions.map((s, i) => 
      prisma.programSession.update({
        where: { id: s.id },
        data: { sessionNumber: i + 1 }
      })
    );
    await prisma.$transaction(updatePromises);

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
