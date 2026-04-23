import { writeFile, mkdir } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Ensure directory exists
  const uploadDir = path.join(process.cwd(), 'public/uploads');
  try {
      await mkdir(uploadDir, { recursive: true });
  } catch (e) {
      console.error("Error creating upload dir:", e);
  }

  // Generate unique filename
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
  const filepath = path.join(uploadDir, filename);

  await writeFile(filepath, buffer);
  
  return NextResponse.json({ 
      success: true, 
      url: `/uploads/${filename}`,
      name: file.name
  });
}
