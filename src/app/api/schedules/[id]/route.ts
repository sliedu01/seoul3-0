import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifySession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, startDate, endDate } = body;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : null;

    if ((start && isNaN(start.getTime())) || (end && isNaN(end.getTime()))) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    try {
      const schedule = await prisma.otherSchedule.update({
        where: { id },
        data: {
          title,
          startDate: start,
          endDate: end,
        },
      });
      return NextResponse.json(schedule);
    } catch (e: any) {
      if (e.code === 'P2025') {
        return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
      }
      throw e;
    }
  } catch (error: any) {
    console.error("Failed to update schedule:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`[API] Attempting to DELETE schedule ID: ${id}`);
    const user = await verifySession();
    if (!user) {
      console.error("[API] DELETE unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "OPERATOR") {
      console.error(`[API] DELETE forbidden for role: ${user.role}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prisma delete throws an error if not found. deleteMany returns a count.
    const result = await prisma.otherSchedule.deleteMany({
      where: { id },
    });

    console.log(`[API] DELETE result count for ${id}: ${result.count}`);

    if (result.count === 0) {
      return NextResponse.json({ error: "Schedule not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete schedule:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message 
    }, { status: 500 });
  }
}
