import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await params;

    await prisma.surveyDocument.delete({
      where: { id: docId },
    });

    return NextResponse.json({ success: true, message: "문서가 삭제되었습니다." });
  } catch (error: any) {
    console.error("Failed to delete survey document:", error);
    return NextResponse.json(
      { error: "문서 삭제 실패", details: error.message },
      { status: 500 }
    );
  }
}
