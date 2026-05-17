import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("id");

  if (!contactId) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  try {
    await prisma.contact.update({
      where: { id: contactId },
      data: { status: 'UNSUBSCRIBED' }
    });

    return new NextResponse(`
      <html>
        <head>
          <title>Unsubscribed</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; padding: 2rem; rounded: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 400px; border-radius: 16px; }
            h1 { color: #0f4d39; margin-bottom: 1rem; }
            p { color: #64748b; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Berhasil Berhenti Berlangganan</h1>
            <p>Email Anda telah dihapus dari daftar pengiriman kami. Kami sedih melihat Anda pergi, tetapi kami menghormati privasi Anda.</p>
            <p style="font-size: 12px; margin-top: 2rem;">Anda dapat menutup halaman ini sekarang.</p>
          </div>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" }
    });
  } catch (error) {
    return new NextResponse("Gagal memproses permintaan.", { status: 500 });
  }
}
