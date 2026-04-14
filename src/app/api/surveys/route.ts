import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const programIds = searchParams.get("programIds")?.split(",").filter(Boolean);
    const partnerIds = searchParams.get("partnerIds")?.split(",").filter(Boolean);
    const researchTarget = searchParams.get("researchTarget");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" || "desc";

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { respondentId: { contains: search } },
        { session: { program: { name: { contains: search } } } }
      ];
    }

    if (startDate || endDate) {
      whereClause.session = { ...whereClause.session, date: {} };
      if (startDate) whereClause.session.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.session.date.lte = end;
      }
    }

    if (programIds?.length) {
      whereClause.session = { ...whereClause.session, programId: { in: programIds } };
    }
    if (partnerIds?.length) {
      whereClause.session = { ...whereClause.session, partnerId: { in: partnerIds } };
    }
    if (researchTarget) {
      whereClause.researchTarget = researchTarget;
    }
    const type = searchParams.get("type");
    if (type && type !== "ALL") {
      if (type === "MATURITY") {
        whereClause.type = { in: ["PRE", "POST"] };
      } else {
        whereClause.type = type;
      }
    }

    const orderBy: any = {};
    if (sortBy === "program") {
      orderBy.session = { program: { name: sortOrder } };
    } else if (sortBy === "partner") {
      orderBy.session = { partner: { name: sortOrder } };
    } else if (sortBy === "sessionNumber") {
      orderBy.session = { sessionNumber: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [surveys, total] = await Promise.all([
      prisma.surveyResponse.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          session: {
            select: { 
              sessionNumber: true,
              date: true,
              startTime: true,
              endTime: true,
              program: {
                select: { name: true }
              },
              partner: {
                select: { name: true }
              },
            }
          },
          answers: true,
          template: {
            include: {
              questions: true
            }
          },
        },
        orderBy
      }),
      prisma.surveyResponse.count({ where: whereClause })
    ]);

    return NextResponse.json({
      surveys,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Failed to fetch surveys:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
