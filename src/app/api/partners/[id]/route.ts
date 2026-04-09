import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: {
        sessions: {
          include: { program: true }
        }
      }
    });
    if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(partner);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, contactName, contactPhone, contactEmail, address, businessRegistration, contractFile, contractFile2, contractFile3, contractFile4, contractFile5, insuranceFile, bankbookFile, preInspectionFile } = body;
    const partner = await prisma.partner.update({
      where: { id },
      data: { name, contactName, contactPhone, contactEmail, address, businessRegistration, contractFile, contractFile2, contractFile3, contractFile4, contractFile5, insuranceFile, bankbookFile, preInspectionFile },
    });
    return NextResponse.json(partner);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.partner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
