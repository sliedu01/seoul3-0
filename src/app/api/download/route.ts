import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawFileName =
      searchParams.get("file") ||
      searchParams.get("filename") ||
      searchParams.get("fileName");

    if (!rawFileName) {
      return NextResponse.json(
        { error: "파일 이름이 필요합니다." },
        { status: 400 }
      );
    }

    // Handle NFC/NFD normalization for Korean filenames
    const nfcName = rawFileName.normalize("NFC");
    const nfdName = rawFileName.normalize("NFD");

    // Try to find the file in either form
    let fileRecord = await prisma.fileStorage.findUnique({
      where: { fileName: nfcName },
    });

    if (!fileRecord && nfcName !== nfdName) {
      fileRecord = await prisma.fileStorage.findUnique({
        where: { fileName: nfdName },
      });
    }

    if (!fileRecord) {
      return NextResponse.json(
        {
          error: "파일을 데이터베이스에서 찾을 수 없습니다.",
          debug: { requested: rawFileName, nfc: nfcName, nfd: nfdName },
        },
        { status: 404 }
      );
    }

    // 다운로드 시 SHA-256 해시 재계산하여 무결성 검증
    const downloadHash = crypto
      .createHash("sha256")
      .update(new Uint8Array(fileRecord.data))
      .digest("hex");

    // 저장된 해시가 있을 경우 비교 검증
    if (fileRecord.sha256 && downloadHash !== fileRecord.sha256) {
      console.error(
        `[INTEGRITY ALERT] Hash mismatch for ${rawFileName}: stored=${fileRecord.sha256}, computed=${downloadHash}`
      );
      return NextResponse.json(
        {
          error:
            "파일 무결성 검증 실패: 저장된 파일이 변조된 것으로 의심됩니다. 관리자에게 문의하세요.",
        },
        { status: 500 }
      );
    }

    // Create a safe ASCII filename for fallback
    const safeFileName = nfcName.replace(/[^\x20-\x7E]/g, "_");

    return new Response(new Uint8Array(fileRecord.data), {
      headers: {
        "Content-Type": fileRecord.mimeType || "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(nfcName)}`,
        "Content-Length": fileRecord.data.length.toString(),
        "X-File-SHA256": downloadHash,
        "X-File-Size": fileRecord.data.length.toString(),
        "X-File-Integrity": "verified",
      },
    });
  } catch (error: any) {
    console.error("Download Error:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
