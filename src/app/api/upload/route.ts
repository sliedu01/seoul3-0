import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to PostgreSQL via Prisma
    const savedFile = await prisma.fileStorage.upsert({
      where: { fileName: file.name },
      update: {
        data: buffer,
        mimeType: file.type || "application/pdf"
      },
      create: {
        fileName: file.name,
        data: buffer,
        mimeType: file.type || "application/pdf"
      }
    });

    return NextResponse.json({ success: true, fileName: savedFile.fileName });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Failed to upload file", details: error.message }, { status: 500 });
  }
}
