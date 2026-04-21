import { sendEmail } from './services/emailService';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the root of the server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testSMTP() {
    console.log('--- SMTP Configuration Test ---');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_FROM:', process.env.SMTP_FROM);
    console.log('-------------------------------');

    if (!process.env.SMTP_HOST || process.env.SMTP_USER === 'your-email@gmail.com') {
        console.log('Skipping actual email send because configuration is still at default/placeholder values.');
        console.log('Please update your .env file with valid SMTP credentials to run a full test.');
        return;
    }

    try {
        console.log('Attempting to send a test email...');
        await sendEmail({
            to: process.env.SMTP_USER as string,
            subject: 'AgriLink SMTP Test',
            text: 'This is a test email from AgriLink to verify SMTP configuration.',
            html: '<h1>AgriLink SMTP Test</h1><p>This is a test email from AgriLink to verify SMTP configuration.</p>',
        });
        console.log('Test email sent successfully!');
    } catch (error) {
        console.error('Test email failed:', error);
    }
}

testSMTP();
