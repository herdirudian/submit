"use server";

import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendWaTemplate } from "@/lib/whatsapp";
import { createNotification } from "./notification";

export async function submitForm(formId: string, data: Record<string, any>) {
    const form = await prisma.form.findUnique({
        where: { id: formId },
        select: { status: true }
    });
    if (!form || form.status !== "PUBLISHED") {
        throw new Error("Form tidak tersedia");
    }

    // 1. Create Response
    const response = await prisma.response.create({
        data: {
            formId,
        },
        include: {
            form: {
                include: {
                    user: true
                }
            }
        }
    });

    const appSettings = await prisma.appSettings.findUnique({
        where: { id: "singleton" },
        select: { notificationFromName: true, notificationFromEmail: true }
    });

    // 2. Create Answers
    // Filter out non-question fields and prepare data
    const answersData = Object.entries(data)
        .filter(([key]) => key !== 'formId') // Filter out formId or other metadata if present
        .map(([questionId, value]) => {
            // Handle array values (like Checkbox) by joining them or JSON stringifying
            let stringValue = value;
            if (Array.isArray(value)) {
                stringValue = value.join(', '); // or JSON.stringify(value)
            } else if (typeof value !== 'string') {
                stringValue = String(value);
            }

            return {
                responseId: response.id,
                questionId,
                value: stringValue
            };
        });

    if (answersData.length > 0) {
        // We need to verify that all questionIds actually exist to prevent foreign key errors
        // This is important because the form data might contain internal React Hook Form fields
        
        // Fetch valid question IDs for this form
        const validQuestions = await prisma.question.findMany({
            where: { formId },
            select: { id: true, type: true, label: true }
        });
        const validQuestionIds = new Set(validQuestions.map(q => q.id));

        const validAnswers = answersData.filter(a => validQuestionIds.has(a.questionId));

        if (validAnswers.length > 0) {
            await prisma.answer.createMany({
                data: validAnswers
            });

            // --- NOTIFICATION LOGIC ---
            // Create in-app notification for admin
             await createNotification(
                response.form.userId,
                "New Submission",
                `New response for "${response.form.title}"`,
                `/forms/${formId}` // Link to form responses page
            );

            // --- EMAIL NOTIFICATION LOGIC ---
            
            // 1. Notify Admin (Form Owner)
            const adminEmail = response.form.user.email;
            if (adminEmail) {
                const formTitle = response.form.title;
                const responseIdShort = response.id.substring(0, 8);
                
                let emailContent = `
                    <h2>New Submission for ${formTitle}</h2>
                    <p>A new response has been submitted.</p>
                    <p><strong>Response ID:</strong> ${responseIdShort}</p>
                    <hr />
                    <h3>Answers:</h3>
                    <ul>
                `;

                validAnswers.forEach(ans => {
                    const question = validQuestions.find(q => q.id === ans.questionId);
                    if (question) {
                        emailContent += `<li><strong>${question.label}:</strong> ${ans.value}</li>`;
                    }
                });

                emailContent += `</ul>`;
                
                // Send async without awaiting to not block response
                sendEmail({
                    to: adminEmail,
                    subject: `[New Submission] ${formTitle}`,
                    html: emailContent,
                    fromName: appSettings?.notificationFromName,
                    fromEmail: appSettings?.notificationFromEmail
                });
            }

            // 2. Notify Respondent (Confirmation)
            // Look for an answer that corresponds to an EMAIL question type
            const emailQuestion = validQuestions.find(q => q.type === 'EMAIL');
            if (emailQuestion) {
                const emailAnswer = validAnswers.find(a => a.questionId === emailQuestion.id);
                if (emailAnswer && emailAnswer.value) {
                    const respondentEmail = emailAnswer.value;
                    const formTitle = response.form.title;
                    const emailSubject = response.form.emailSubject || `Submission Received: ${formTitle}`;
                    const customBody = response.form.emailBody ? `<p>${response.form.emailBody.replace(/\n/g, '<br>')}</p><br/>` : '';

                    const confirmationHtml = `
                        <h2>${response.form.thankYouTitle || "Thank you for your submission!"}</h2>
                        ${customBody}
                        <p>We have received your response for <strong>${formTitle}</strong>.</p>
                        <p>We will review it and get back to you shortly if necessary.</p>
                        <br />
                        <p>Best regards,</p>
                        <p>${response.form.sidebarTitle || "The Lodge Team"}</p>
                    `;

                    // Send async
                    sendEmail({
                        to: respondentEmail,
                        subject: emailSubject,
                        html: confirmationHtml,
                        fromName: appSettings?.notificationFromName,
                        fromEmail: appSettings?.notificationFromEmail
                    });
                }
            }

            // 3. WhatsApp Integration
            if (response.form.whatsappEnabled && response.form.whatsappTemplateName && response.form.whatsappPhoneFieldId) {
                const phoneAnswer = validAnswers.find(a => a.questionId === response.form.whatsappPhoneFieldId);
                if (phoneAnswer && phoneAnswer.value) {
                    let phone = phoneAnswer.value.replace(/\D/g, '');
                    if (phone.startsWith('0')) {
                        phone = '62' + phone.substring(1);
                    }
                    
                    // Find customer name if available
                    const nameQuestion = validQuestions.find(q => q.label.toLowerCase().includes('nama'));
                    const nameAnswer = nameQuestion ? validAnswers.find(a => a.questionId === nameQuestion.id) : null;
                    const customerName = nameAnswer?.value || "Pelanggan";

                    // Fetch template language
                    const template = await prisma.waTemplate.findFirst({
                        where: { name: response.form.whatsappTemplateName },
                        orderBy: { language: 'desc' }
                    });

                    if (template) {
                        const components = JSON.parse(template.components);
                        const finalComponents = [];

                        // 1. Handle HEADER (Media)
                        const headerComponent = components.find((c: any) => c.type === 'HEADER');
                        if (headerComponent && (headerComponent.format === 'IMAGE' || headerComponent.format === 'VIDEO' || headerComponent.format === 'DOCUMENT')) {
                            // Meta examples can be header_handle (ID) or a link
                            const mediaHandle = headerComponent.example?.header_handle?.[0];
                            const mediaLink = headerComponent.example?.header_text?.[0]; // Sometimes it's here for some types
                            
                            const mediaType = headerComponent.format.toLowerCase();
                            const mediaData: any = {};
                            
                            if (mediaHandle) {
                                mediaData.id = mediaHandle;
                            } else if (mediaLink && mediaLink.startsWith('http')) {
                                mediaData.link = mediaLink;
                            }

                            if (mediaData.id || mediaData.link) {
                                finalComponents.push({
                                    type: 'header',
                                    parameters: [
                                        {
                                            type: mediaType,
                                            [mediaType]: mediaData
                                        }
                                    ]
                                });
                            } else {
                                console.warn(`[WA-SUBMIT] Template "${template.name}" has ${headerComponent.format} header but no example handle/link found.`);
                            }
                        }

                        // 2. Handle BODY (Text Variables)
                        const bodyComponent = components.find((c: any) => c.type === 'BODY');
                        const bodyVarCount = bodyComponent?.text ? (bodyComponent.text.match(/\{\{\d+\}\}/g) || []).length : 0;
                        
                        if (bodyVarCount > 0) {
                            const bodyParams = [];
                            if (bodyVarCount >= 1) bodyParams.push({ type: 'text', text: customerName });
                            if (bodyVarCount >= 2) bodyParams.push({ type: 'text', text: response.form.sidebarTitle || "The Lodge" });
                            for (let i = 2; i < bodyVarCount; i++) {
                                bodyParams.push({ type: 'text', text: "-" });
                            }
                            
                            finalComponents.push({
                                type: 'body',
                                parameters: bodyParams
                            });
                        }

                        // Send async
                        console.log(`[WA-SUBMIT] Sending template "${template.name}" to ${phone} with components:`, JSON.stringify(finalComponents));
                        sendWaTemplate(
                            phone,
                            template.name,
                            template.language,
                            finalComponents
                        ).catch(err => console.error("[WA-SUBMIT-ERROR]", err));
                    }
                }
            }
        }
    }

    return response;
}
