import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await verifySession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules = await prisma.otherSchedule.findMany({
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifySession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "OPERATOR") {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, startDate, endDate } = body;

    if (!title || !startDate) {
      return NextResponse.json({ error: "Title and startDate are required" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    if (isNaN(start.getTime()) || (end && isNaN(end.getTime()))) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const schedule = await prisma.otherSchedule.create({
      data: {
        title,
        startDate: start,
        endDate: end,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create schedule:", error);
    return NextResponse.json({ 
       error: "Internal Server Error", 
       details: error.message 
    }, { status: 500 });
  }
}
