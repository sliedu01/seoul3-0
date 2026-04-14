import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const executionDateStr = formData.get("executionDate") as string;
    const evidenceType = formData.get("evidenceType") as string || "기타증빙";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. 날짜 포맷팅 (YYYYMMDD)
    const dateObj = executionDateStr ? new Date(executionDateStr) : new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${dateObj.getFullYear()}${pad(dateObj.getMonth() + 1)}${pad(dateObj.getDate())}`;

    // 2. 파일 확장자 유지
    const originalFileName = file.name;
    const extMatch = originalFileName.match(/\.[0-9a-z]+$/i);
    const extension = extMatch ? extMatch[0] : ".pdf";

    // 3. 증빙자료명 (타입) 공백 제거
    const cleanType = evidenceType.replace(/\s+/g, "");

    // 4. 당일 동일 타입의 파일 개수를 조회 (시퀀스 채번)
    // expenditure를 검색할 수도 있고, 그냥 고유 ID 채번을 위해 FileStorage를 검색할 수도 있음.
    // 여기서는 안전하게 prefix 패턴을 활용
    const prefix = `${dateStr}_${cleanType}_`;
    const count = await prisma.fileStorage.count({
        where: {
            fileName: { startsWith: prefix }
        }
    });
    
    const serialNum = (count + 1).toString().padStart(3, '0');
    // 고유 파일 ID
    const evidenceFileId = `${prefix}${serialNum}`;
    const evidenceFileName = `${evidenceFileId}${extension}`;

    // 5. Binary 데이터 추출 및 SHA-256 해시 계산
    const buffer = Buffer.from(await file.arrayBuffer());
    const hashSum = createHash('sha256');
    hashSum.update(buffer);
    const sha256 = hashSum.digest('hex');

    // 6. DB에 FileStorage 기록
    await prisma.fileStorage.create({
      data: {
        fileName: evidenceFileName,
        data: buffer,
        mimeType: file.type,
        fileSize: buffer.length,
        sha256: sha256
      }
    });

    return NextResponse.json({
      evidenceFileId,
      evidenceFileName,
      originalFileName,
      sha256,
      message: "File uploaded exactly as original with new unique ID"
    });
  } catch (error) {
    console.error("Evidence Upload API Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
