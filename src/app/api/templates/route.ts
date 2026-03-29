import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const templates = await prisma.questionTemplate.findMany({
      include: {
        program: true,
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, subType, scope, programId, description, googleFormUrl } = body;
    const template = await prisma.questionTemplate.create({
      data: { 
        name,
        type, 
        subType,
        scope, 
        description,
        googleFormUrl,
        programId: programId || null
      },
    });
    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
