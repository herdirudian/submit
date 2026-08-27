import { writeFile, mkdir } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("file") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No files uploaded" }, { status: 400 });
    }

    const uploadResults = [];
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const safeName = file.name
        .split('.')[0]
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50);

      const extension = path.extname(file.name).toLowerCase();
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${safeName}${extension}`;
      
      const filePath = path.join(uploadDir, filename);
      await writeFile(filePath, buffer);

      const url = `/uploads/${filename}`;
      uploadResults.push({ url, filename, originalName: file.name });
    }

    return NextResponse.json({ 
      success: true, 
      urls: uploadResults.map(r => r.url),
      files: uploadResults
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
