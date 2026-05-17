import { writeFile, mkdir } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a very safe filename (alphanumeric, dots, and hyphens only)
    const safeName = file.name
      .split('.')[0] // Get name without extension
      .replace(/[^a-zA-Z0-9]/g, "-") // Replace everything not alphanumeric with hyphen
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .substring(0, 50); // Limit length to 50 chars for stability

    const extension = path.extname(file.name).toLowerCase();
    const filename = `${Date.now()}-${safeName}${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    
    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Get the base URL dynamically from the request headers
    // This ensures it matches the domain the user is currently using
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host");
    const baseUrl = `${protocol}://${host}`;
    const url = `${baseUrl}/uploads/${filename}`;

    console.log(`File uploaded to: ${filePath}`);
    console.log(`Dynamic absolute URL: ${url}`);

    return NextResponse.json({ 
      success: true, 
      url: url,
      filename 
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
