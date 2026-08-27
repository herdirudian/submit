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
            form: {
                connect: { id: formId }
            }
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
            if (response.form.sendEmailConfirmation) {
                // Find email address based on configured field or auto-detect
                let respondentEmail = "";
                
                if (response.form.emailConfirmationFieldId) {
                    const emailAnswer = validAnswers.find(a => a.questionId === response.form.emailConfirmationFieldId);
                    if (emailAnswer && emailAnswer.value && emailAnswer.value.includes('@')) {
                        respondentEmail = emailAnswer.value;
                    }
                } else {
                    // Fallback to auto-detection if no field is configured but feature is ON
                    const emailQuestion = validQuestions.find(q => q.type === 'EMAIL');
                    if (emailQuestion) {
                        const emailAnswer = validAnswers.find(a => a.questionId === emailQuestion.id);
                        if (emailAnswer && emailAnswer.value) {
                            respondentEmail = emailAnswer.value;
                        }
                    }
                }

                if (respondentEmail) {
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
            console.log(`[WA-SUBMIT] Checking WhatsApp integration for form: ${formId}`);
            if (response.form.whatsappEnabled && response.form.whatsappTemplateName && response.form.whatsappPhoneFieldId) {
                console.log(`[WA-SUBMIT] WhatsApp integration ENABLED. Template: ${response.form.whatsappTemplateName}, Phone Field: ${response.form.whatsappPhoneFieldId}`);
                
                const phoneAnswer = validAnswers.find(a => a.questionId === response.form.whatsappPhoneFieldId);
                console.log(`[WA-SUBMIT] Phone answer found:`, phoneAnswer?.value);

                if (phoneAnswer && phoneAnswer.value) {
                    let phone = phoneAnswer.value.replace(/\D/g, '');
                    if (phone.startsWith('0')) {
                        phone = '62' + phone.substring(1);
                    }
                    console.log(`[WA-SUBMIT] Formatted phone: ${phone}`);
                    
                    // Find customer name if available
                    const nameQuestion = validQuestions.find(q => q.label.toLowerCase().includes('nama'));
                    const nameAnswer = nameQuestion ? validAnswers.find(a => a.questionId === nameQuestion.id) : null;
                    const customerName = nameAnswer?.value || "Pelanggan";

                    // Fetch template language
                    console.log(`[WA-SUBMIT] Fetching template data from DB...`);
                    const template = await prisma.waTemplate.findFirst({
                        where: { name: response.form.whatsappTemplateName },
                        orderBy: { language: 'desc' }
                    });

                    if (template) {
                        console.log(`[WA-SUBMIT] Template found in DB: ${template.name} (${template.language})`);
                        const components = typeof template.components === 'string' ? JSON.parse(template.components) : template.components;
                        const finalComponents = [];

                        // 1. Handle HEADER (Media)
                        const headerComponent = components.find((c: any) => c.type === 'HEADER');
                        if (headerComponent && (headerComponent.format === 'IMAGE' || headerComponent.format === 'VIDEO' || headerComponent.format === 'DOCUMENT')) {
                            console.log(`[WA-SUBMIT] Template "${template.name}" has HEADER component:`, JSON.stringify(headerComponent, null, 2));
                            
                            // Meta examples can be header_handle (ID) or a link
                            // We check multiple possible locations for the media identifier
                            let mediaHandle = headerComponent.example?.header_handle?.[0];
                            const mediaLink = headerComponent.example?.header_text?.[0] || 
                                             headerComponent.example?.header_url?.[0] || 
                                             headerComponent.example?.header_handle?.[0]; // Fallback
                            
                            // Regex fallback to find anything that looks like a Meta ID (10-20 digits)
                            if (!mediaHandle && headerComponent.example) {
                                const exampleStr = JSON.stringify(headerComponent.example);
                                const idMatch = exampleStr.match(/"(\d{10,25})"/);
                                if (idMatch) {
                                    mediaHandle = idMatch[1];
                                    console.log(`[WA-SUBMIT] Found potential ID via regex: ${mediaHandle}`);
                                }
                            }

                            // Debugging more fields
                            console.log(`[WA-SUBMIT] Media detection: handle=${mediaHandle}, link=${mediaLink}`);
                            console.log(`[WA-SUBMIT] Full Example data:`, JSON.stringify(headerComponent.example, null, 2));

                            let mediaType = headerComponent.format.toLowerCase();
                            // Meta expects specific types: document, image, video
                            if (headerComponent.format === 'DOCUMENT') mediaType = 'document';
                            if (headerComponent.format === 'IMAGE') mediaType = 'image';
                            if (headerComponent.format === 'VIDEO') mediaType = 'video';
                            
                            const mediaData: any = {};
                            
                            if (mediaHandle) {
                                // Meta expects the ID (handle) to be an integer
                                mediaData.id = parseInt(mediaHandle, 10);
                                console.log(`[WA-SUBMIT] Using media ID (handle) as integer: ${mediaData.id}`);
                            } else if (mediaLink && mediaLink.startsWith('http')) {
                                mediaData.link = mediaLink;
                                console.log(`[WA-SUBMIT] Using media Link from example: ${mediaLink}`);
                            }

                            if (mediaData.id || mediaData.link) {
                                // For documents, Meta sometimes expects a filename
                                if (mediaType === 'document' && !mediaData.filename) {
                                    mediaData.filename = `${template.name}.pdf`;
                                }

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
                                console.error(`[WA-SUBMIT] CRITICAL: Template "${template.name}" requires ${headerComponent.format} header, but no example ID or Link was found in database. SKIPPING HEADER to avoid Meta rejection.`);
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
                        console.log(`[WA-SUBMIT] Final Payload Components:`, JSON.stringify(finalComponents, null, 2));
                        sendWaTemplate(
                            phone,
                            template.name,
                            template.language,
                            finalComponents
                        ).then(async (res) => {
                            if (res.success) {
                                console.log(`[WA-SUBMIT] SUCCESS: WhatsApp sent to ${phone}. ID: ${res.data?.messages?.[0]?.id}`);
                                
                                // Save to CRM Database
                                try {
                                    const waMessageId = res.data?.messages?.[0]?.id;
                                    
                                    // 1. Ensure Chat exists
                                    let chat = await prisma.waChat.findUnique({
                                        where: { waId: phone }
                                    });

                                    if (!chat) {
                                        // Find or Create Contact
                                        let contact = await prisma.contact.findFirst({
                                            where: { OR: [{ phone: phone }, { waNumber: phone }] }
                                        });

                                        if (!contact) {
                                            contact = await prisma.contact.create({
                                                data: {
                                                    name: customerName,
                                                    phone: phone,
                                                    waNumber: phone,
                                                    infoSource: `Form: ${response.form.title}`
                                                }
                                            });
                                        }

                                        chat = await prisma.waChat.create({
                                            data: {
                                                waId: phone,
                                                contactId: contact.id,
                                                status: 'OPEN',
                                                lastMessage: template.content || `Template: ${template.name}`,
                                                lastMessageAt: new Date()
                                            }
                                        });
                                    }

                                    // 2. Create Message
                                    await prisma.waMessage.create({
                                        data: {
                                            chatId: chat.id,
                                            waMessageId: waMessageId,
                                            body: template.content || `Template: ${template.name}`,
                                            fromMe: true,
                                            type: headerComponent ? headerComponent.format : 'TEXT',
                                            templateName: template.name,
                                            status: 'SENT'
                                        }
                                    });

                                    // 3. Update Chat Last Message
                                    await prisma.waChat.update({
                                        where: { id: chat.id },
                                        data: {
                                            lastMessage: template.content || `Template: ${template.name}`,
                                            lastMessageAt: new Date()
                                        }
                                    });

                                    console.log(`[WA-SUBMIT] CRM Sync: Message saved to chat history for ${phone}`);
                                } catch (dbErr) {
                                    console.error(`[WA-SUBMIT] CRM Sync Error:`, dbErr);
                                }
                            } else {
                                console.error(`[WA-SUBMIT] FAILED: Meta API Error:`, JSON.stringify(res.error, null, 2));
                            }
                        }).catch(err => {
                            console.error("[WA-SUBMIT] CRITICAL ERROR during sendWaTemplate:", err);
                        });
                    } else {
                        console.error(`[WA-SUBMIT] Template "${response.form.whatsappTemplateName}" NOT FOUND in database.`);
                    }
                } else {
                    console.warn(`[WA-SUBMIT] Phone number not found in submission data for field ${response.form.whatsappPhoneFieldId}`);
                }
            } else {
                console.log(`[WA-SUBMIT] WhatsApp integration is disabled or not configured for this form.`);
            }
        }
    }

    return response;
}
