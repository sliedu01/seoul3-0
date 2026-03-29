import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const partners = await prisma.partner.findMany({
      include: {
        sessions: {
          select: { programId: true, date: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    // Flatten programIds and sessionDates for each partner
    const processed = partners.map(p => ({
      ...p,
      programIds: Array.from(new Set(p.sessions.map(s => s.programId))),
      sessionDates: p.sessions.map(s => s.date)
    }));
    return NextResponse.json(processed);
  } catch (error: any) {
    return NextResponse.json({ 
      error: "Failed to fetch partners", 
      details: error.message || String(error),
      code: error.code
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, contactName, contactPhone, contactEmail, address, businessRegistration, contractFile, insuranceFile, bankbookFile } = body;
    const partner = await prisma.partner.create({
      data: { name, contactName, contactPhone, contactEmail, address, businessRegistration, contractFile, insuranceFile, bankbookFile },
    });
    return NextResponse.json(partner);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create partner" }, { status: 500 });
  }
}
