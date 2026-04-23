import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
  fromName,
  fromEmail,
}: {
  to: string;
  subject: string;
  html: string;
  fromName?: string | null;
  fromEmail?: string | null;
}) {
  try {
    const fallbackEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || "";
    const finalFromEmail = (fromEmail ?? "").trim() || fallbackEmail;
    const finalFromName = (fromName ?? "").trim();
    const from = finalFromEmail
      ? finalFromName
        ? `"${finalFromName}" <${finalFromEmail}>`
        : finalFromEmail
      : undefined;

    const info = await transporter.sendMail({
      ...(from ? { from } : {}),
      to,
      subject,
      html,
    });
    console.log("Message sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}
