import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const meetings = await prisma.meetingMinute.findMany({
      orderBy: { date: "desc" }
    });
    return NextResponse.json(meetings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      date, title, pdfFilePath, sequenceNumber, managedOrg, 
      attendees, purpose, agenda, preparation, nextSchedule, meetingContent, others 
    } = body;
    const meeting = await prisma.meetingMinute.create({
      data: {
        date: new Date(date),
        title,
        pdfFilePath,
        sequenceNumber: parseInt(sequenceNumber) || 1,
        managedOrg,
        attendees,
        purpose,
        agenda,
        preparation,
        nextSchedule,
        meetingContent: meetingContent || "",
        others
      }
    });
    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Failed to create meeting:", error);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}
