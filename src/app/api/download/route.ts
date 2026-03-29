import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("file");

    if (!fileName) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "uploads", fileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error: any) {
    console.error("Download Error:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
