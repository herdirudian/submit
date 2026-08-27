import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true, // Use pooling for blast emails
  maxConnections: 5,
  maxMessages: 100,
});

export async function sendEmail({
  to,
  subject,
  html,
  fromName,
  fromEmail,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  fromName?: string | null;
  fromEmail?: string | null;
  attachments?: { filename: string; path: string }[];
}) {
  try {
    const finalFromEmail = (fromEmail ?? "").trim() || process.env.FROM_EMAIL || process.env.SMTP_USER || "";
    const finalFromName = (fromName ?? "").trim() || process.env.FROM_NAME || "";
    
    const from = finalFromEmail
      ? finalFromName
        ? `"${finalFromName}" <${finalFromEmail}>`
        : finalFromEmail
      : undefined;

    const mailOptions: nodemailer.SendMailOptions = {
      from: from || process.env.SMTP_USER,
      to,
      subject,
      html,
      attachments,
    };

    // If we have a dedicated FROM_EMAIL that is different from SMTP_USER,
    // we should ensure it's allowed. If not, we fallback to SMTP_USER.
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully to %s: %s", to, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}
