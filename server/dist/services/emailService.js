"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const sendEmail = async (options) => {
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
    }
    catch (error) {
        console.error('CRITICAL ERROR: Email delivery failed:', error);
        throw error;
    }
};
exports.sendEmail = sendEmail;
