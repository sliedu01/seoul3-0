import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * 파일 무결성 독립 검증 API
 * GET /api/files/verify?file=<fileName>
 * 
 * Response:
 * {
 *   fileName: string
 *   storedHash: string | null
 *   computedHash: string
 *   isValid: boolean
 *   fileSize: number
 *   storedSize: number | null
 *   mimeType: string
 * }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawFileName = searchParams.get("file");

    if (!rawFileName) {
      return NextResponse.json(
        { error: "파일 이름이 필요합니다. (?file=파일명)" },
        { status: 400 }
      );
    }

    const nfcName = rawFileName.normalize("NFC");
    const nfdName = rawFileName.normalize("NFD");

    let fileRecord = await prisma.fileStorage.findUnique({
      where: { fileName: nfcName },
      select: {
        fileName: true,
        mimeType: true,
        sha256: true,
        fileSize: true,
        data: true,
        createdAt: true,
      },
    });

    if (!fileRecord && nfcName !== nfdName) {
      fileRecord = await prisma.fileStorage.findUnique({
        where: { fileName: nfdName },
        select: {
          fileName: true,
          mimeType: true,
          sha256: true,
          fileSize: true,
          data: true,
          createdAt: true,
        },
      });
    }

    if (!fileRecord) {
      return NextResponse.json(
        { error: "파일을 찾을 수 없습니다.", fileName: rawFileName },
        { status: 404 }
      );
    }

    // SHA-256 해시 재계산
    const computedHash = crypto
      .createHash("sha256")
      .update(new Uint8Array(fileRecord.data))
      .digest("hex");

    const actualSize = fileRecord.data.length;
    const hashMatch = !fileRecord.sha256 || computedHash === fileRecord.sha256;
    const sizeMatch = !fileRecord.fileSize || actualSize === fileRecord.fileSize;
    const isValid = hashMatch && sizeMatch;

    return NextResponse.json({
      fileName: fileRecord.fileName,
      mimeType: fileRecord.mimeType,
      storedHash: fileRecord.sha256,
      computedHash,
      hashMatch,
      storedSize: fileRecord.fileSize,
      actualSize,
      sizeMatch,
      isValid,
      uploadedAt: fileRecord.createdAt,
    });
  } catch (error: any) {
    console.error("File Verify Error:", error);
    return NextResponse.json(
      { error: "파일 검증 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}
