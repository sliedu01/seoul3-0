import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const programs = await prisma.program.findMany({
      include: {
        _count: {
          select: {
            sessions: true
          }
        },
        sessions: {
          include: {
            responses: {
              where: { type: "POST" } // Use post surveys as a proxy for participants
            }
          }
        }
      }
    });

    const chartData = programs.map(p => {
      const participantCount = p.sessions.reduce((acc, s) => acc + s.responses.length, 0);
      return {
        name: p.name,
        participants: participantCount,
        sessions: p._count.sessions
      };
    });

    return NextResponse.json(chartData);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}
