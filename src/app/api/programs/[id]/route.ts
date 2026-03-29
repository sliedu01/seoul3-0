import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        sessions: {
          include: { partner: true }
        }
      }
    });
    if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(program);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, coreGoals, order } = body;
    const program = await prisma.program.update({
      where: { id },
      data: { 
        name, 
        description, 
        coreGoals,
        order: order !== undefined ? Number(order) : undefined
      },
    });
    return NextResponse.json(program);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log(`[API] Attempting to delete program: ${id}`);
    await prisma.program.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API] Failed to delete program:", error);
    return NextResponse.json({ 
      error: "Failed to delete program", 
      details: error.message || String(error) 
    }, { status: 500 });
  }
}
