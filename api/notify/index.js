
const sgMail = require('@sendgrid/mail');

// Use the provided API Key directly if env var is missing
const API_KEY = process.env.SENDGRID_API_KEY || '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';

sgMail.setApiKey(API_KEY);

module.exports = async function (context, req) {
    if (req.method !== 'POST') {
        context.res = { status: 405, body: "Method Not Allowed" };
        return;
    }

    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
        context.res = { status: 400, body: "Missing required fields (to, subject, content)" };
        return;
    }

    // NOTE: This email address MUST be verified in your SendGrid 'Sender Authentication' settings.
    // If it is not verified, SendGrid will reject the request with a 403 error.
    // We use a generic one here, but you should change it to your verified sender.
    const msg = {
        to,
        from: 'media@yotaweb.org', // This is your verified sender in SendGrid
        subject,
        text: text || '',
        html: html || text,
    };

    try {
        await sgMail.send(msg);
        context.res = { status: 200, body: { message: "Email sent successfully" } };
    } catch (error) {
        context.log.error("SendGrid Error:", error);
        
        const errorDetails = error.response ? error.response.body : error.message;
        
        // Return the specific SendGrid error to the client for debugging
        context.res = { 
            status: 500, 
            body: { 
                error: "Failed to send email", 
                details: errorDetails 
            } 
        };
    }
};
