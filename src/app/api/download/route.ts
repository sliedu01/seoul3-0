import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawFileName = searchParams.get("file") || searchParams.get("filename") || searchParams.get("fileName");

    if (!rawFileName) {
      return NextResponse.json({ error: "파일 이름이 필요합니다.", 오류: "파일 이름이 필요합니다." }, { status: 400 });
    }

    // Handle NFC/NFD normalization for Korean filenames
    const nfcName = rawFileName.normalize("NFC");
    const nfdName = rawFileName.normalize("NFD");

    // Try to find the file in either form
    let fileRecord = await prisma.fileStorage.findUnique({
      where: { fileName: nfcName }
    });

    if (!fileRecord && nfcName !== nfdName) {
      fileRecord = await prisma.fileStorage.findUnique({
        where: { fileName: nfdName }
      });
    }

    if (!fileRecord) {
      return NextResponse.json({ 
        error: "파일을 데이터베이스에서 찾을 수 없습니다.", 
        오류: "파일을 데이터베이스에서 찾을 수 없습니다.",
        debug: { requested: rawFileName, nfc: nfcName, nfd: nfdName }
      }, { status: 404 });
    }

    return new Response(new Uint8Array(fileRecord.data), {
      headers: {
        "Content-Type": fileRecord.mimeType || "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nfcName)}`,
        "Content-Length": fileRecord.data.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Download Error:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
