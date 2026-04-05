import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 세션별 설문 증빙 문서 관리 API
 * GET  /api/sessions/[id]/documents — 목록 조회
 * POST /api/sessions/[id]/documents — 증빙 문서 등록
 */

// GET — 세션별 증빙 문서 목록 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const documents = await prisma.surveyDocument.findMany({
      where: { programSessionId: id },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error: any) {
    console.error("Failed to fetch survey documents:", error);
    return NextResponse.json(
      { error: "증빙 문서 목록 조회 실패", details: error.message },
      { status: 500 }
    );
  }
}

// POST — 증빙 문서 등록
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { type, category, fileName, googleFormUrl, description } = body;

    if (!type || !category) {
      return NextResponse.json(
        { error: "type과 category는 필수 항목입니다." },
        { status: 400 }
      );
    }

    // 세션 존재 확인
    const session = await prisma.programSession.findUnique({
      where: { id },
    });
    if (!session) {
      return NextResponse.json(
        { error: "세션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const document = await prisma.surveyDocument.create({
      data: {
        programSessionId: id,
        type,
        category,
        fileName: fileName || null,
        googleFormUrl: googleFormUrl || null,
        description: description || null,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create survey document:", error);
    return NextResponse.json(
      { error: "증빙 문서 등록 실패", details: error.message },
      { status: 500 }
    );
  }
}
