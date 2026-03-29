import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.meetingMinute.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      title, date, sequenceNumber, managedOrg, attendees, 
      purpose, agenda, preparation, nextSchedule, meetingContent, others,
      pdfFilePath 
    } = body;
    
    const meeting = await prisma.meetingMinute.update({
      where: { id },
      data: { 
        title, 
        date: date ? new Date(date) : undefined,
        sequenceNumber: sequenceNumber !== undefined ? Number(sequenceNumber) : undefined,
        managedOrg,
        attendees,
        purpose,
        agenda,
        preparation,
        nextSchedule,
        meetingContent,
        others,
        pdfFilePath
      },
    });
    return NextResponse.json(meeting);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
