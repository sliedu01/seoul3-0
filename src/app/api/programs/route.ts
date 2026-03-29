import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const programs = await prisma.program.findMany({
      include: {
        sessions: {
          include: {
            partner: true
          },
          orderBy: [
            { date: "asc" },
            { startTime: "asc" }
          ]
        }
      },
      orderBy: { order: "asc" },
    });
    return NextResponse.json(programs);
  } catch (error: any) {
    console.error("Programs API Error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch programs",
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, coreGoals, order } = body;
    const program = await prisma.program.create({
      data: { 
        name, 
        description, 
        coreGoals,
        order: order !== undefined ? Number(order) : 0
      },
    });
    return NextResponse.json(program);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
  }
}
