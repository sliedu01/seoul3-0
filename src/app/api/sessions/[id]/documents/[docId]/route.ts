import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 개별 증빙 문서 관리 API
 * DELETE /api/sessions/[id]/documents/[docId] — 삭제
 * PATCH  /api/sessions/[id]/documents/[docId] — 메모/설명 수정
 */

// DELETE — 증빙 문서 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;

    await prisma.surveyDocument.delete({
      where: { id: docId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete survey document:", error);
    return NextResponse.json(
      { error: "증빙 문서 삭제 실패", details: error.message },
      { status: 500 }
    );
  }
}

// PATCH — 메모/설명 수정
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    const body = await request.json();

    const updateData: any = {};
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.fileName !== undefined) updateData.fileName = body.fileName;
    if (body.googleFormUrl !== undefined) updateData.googleFormUrl = body.googleFormUrl;

    const updated = await prisma.surveyDocument.update({
      where: { id: docId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update survey document:", error);
    return NextResponse.json(
      { error: "증빙 문서 수정 실패", details: error.message },
      { status: 500 }
    );
  }
}
