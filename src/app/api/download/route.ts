import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("file");

    if (!fileName) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

    // Retrieve file from PostgreSQL via Prisma
    const fileRecord = await prisma.fileStorage.findUnique({
      where: { fileName }
    });

    if (!fileRecord) {
      return NextResponse.json({ error: "File not found in database" }, { status: 404 });
    }

    return new Response(fileRecord.data, {
      headers: {
        "Content-Type": fileRecord.mimeType || "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error: any) {
    console.error("Download Error:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
