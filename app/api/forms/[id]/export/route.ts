import prisma from "@/lib/prisma";
import { Parser } from "json2csv";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id } = await params;

  try {
    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
        responses: {
          orderBy: { submittedAt: "desc" },
          include: {
            answers: true,
          },
        },
      },
    });

    if (!form) {
      return new Response("Form not found", { status: 404 });
    }

    const fields = [
      { label: "Submission Date", value: "submittedAt" },
      ...form.questions.map((q) => ({ label: q.label, value: q.id })),
    ];

    const data = form.responses.map((response) => {
      const row: Record<string, string> = {
        submittedAt: response.submittedAt.toISOString(),
      };
      
      form.questions.forEach((q) => {
        const answer = response.answers.find((a) => a.questionId === q.id);
        row[q.id] = answer?.value || "";
      });
      
      return row;
    });

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_responses.csv"`,
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
