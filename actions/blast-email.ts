"use server";

import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type RecipientType = 'ALL_USERS' | 'CUSTOM' | 'FORM_RESPONDENTS';

export async function sendBlastEmail(data: {
  subject: string;
  body: string;
  recipientType: RecipientType;
  customEmails?: string;
  formId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const { subject, body, recipientType, customEmails, formId } = data;
  let recipients: string[] = [];

  if (recipientType === 'ALL_USERS') {
    const users = await prisma.user.findMany({
      select: { email: true },
    });
    recipients = users.map((u) => u.email);
  } else if (recipientType === 'CUSTOM') {
    if (customEmails) {
      recipients = customEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e.length > 0 && e.includes("@"));
    }
  } else if (recipientType === 'FORM_RESPONDENTS' && formId) {
    // Get all email questions for this form
    const emailQuestions = await prisma.question.findMany({
      where: {
        formId,
        type: 'EMAIL',
      },
      select: { id: true },
    });

    const questionIds = emailQuestions.map((q) => q.id);

    if (questionIds.length > 0) {
      // Get all answers for these questions
      const answers = await prisma.answer.findMany({
        where: {
          questionId: { in: questionIds },
        },
        select: { value: true },
      });

      recipients = answers
        .map((a) => a.value)
        .filter((v): v is string => !!v && v.includes("@"));
      
      // Remove duplicates
      recipients = Array.from(new Set(recipients));
    }
  }

  if (recipients.length === 0) {
    return { success: false, message: "No recipients found." };
  }

  let successCount = 0;
  let failCount = 0;

  // Send emails in sequence or chunks to avoid rate limiting issues if many
  // For now, let's do it in a loop
  for (const to of recipients) {
    const result = await sendEmail({
      to,
      subject,
      html: body.replace(/\n/g, "<br/>"), // Simple text to HTML conversion
    });

    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  return {
    success: true,
    message: `Successfully sent ${successCount} emails. ${failCount > 0 ? `Failed to send ${failCount} emails.` : ""}`,
  };
}

export async function getFormsForBlast() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return await prisma.form.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: 'desc' },
  });
}
