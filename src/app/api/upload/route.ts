import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to the root 'uploads' directory
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    const filePath = path.join(uploadDir, file.name);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ success: true, fileName: file.name });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Failed to upload file", details: error.message }, { status: 500 });
  }
}
