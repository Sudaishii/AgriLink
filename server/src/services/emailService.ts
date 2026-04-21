import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: any[];
}

export const sendEmail = async (options: EmailOptions) => {
    console.log('--- ATTEMPTING TO SEND EMAIL ---');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);

    try {
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
            attachments: options.attachments,
        };

        console.log('Mail Options Prepared:', JSON.stringify({ ...mailOptions, html: 'HTML CONTENT HIDDEN', attachments: options.attachments?.map(a => a.filename) }));

        const info = await transporter.sendMail(mailOptions);

        console.log('SUCCESS: Email sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('CRITICAL ERROR: Email delivery failed:', error);
        throw error;
    }
};
