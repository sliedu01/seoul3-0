import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// 허용 파일 타입 (PDF, 이미지, 엑셀)
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

// 최대 파일 크기 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 1. 파일 타입 검증
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `허용되지 않는 파일 형식입니다: ${file.type}. PDF, 이미지(JPG/PNG), 엑셀 파일만 업로드 가능합니다.` },
        { status: 400 }
      );
    }

    // Normalize fileName to NFC for consistent lookup across OS (Win/Mac)
    const normalizedFileName = file.name.normalize("NFC");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. 파일 크기 검증
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `파일 크기가 50MB를 초과합니다. (현재: ${(buffer.length / 1024 / 1024).toFixed(1)}MB)` },
        { status: 400 }
      );
    }

    // 3. SHA-256 해시 계산 (업로드 원본 기준 — 무결성 검증용)
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const fileSize = buffer.length;

    // Save to PostgreSQL via Prisma (Binary 원본 유지, 변형 없음)
    const savedFile = await prisma.fileStorage.upsert({
      where: { fileName: normalizedFileName },
      update: {
        data: buffer,
        mimeType: file.type || "application/pdf",
        fileSize,
        sha256,
      },
      create: {
        fileName: normalizedFileName,
        data: buffer,
        mimeType: file.type || "application/pdf",
        fileSize,
        sha256,
      },
    });

    return NextResponse.json({
      success: true,
      fileName: savedFile.fileName,
      sha256: savedFile.sha256,
      fileSize: savedFile.fileSize,
      mimeType: savedFile.mimeType,
    });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json(
      { error: "Failed to upload file", details: error.message },
      { status: 500 }
    );
  }
}
