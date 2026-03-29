import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const template = await prisma.questionTemplate.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" }
        }
      }
    });
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, type, subType, scope, programId, description, googleFormUrl } = body;
    const template = await prisma.questionTemplate.update({
      where: { id },
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
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const template = await prisma.questionTemplate.update({
      where: { id },
      data: body
    });
    return NextResponse.json(template);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to patch template" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Relations are handled by onDelete: Cascade in schema.prisma,
    // so deleting the template will clean up questions and responses.
    await prisma.questionTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
