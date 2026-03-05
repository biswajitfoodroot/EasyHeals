import nodemailer from 'nodemailer';
import { logger } from '../app.js';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Always CC this address on every outgoing email
const PERMANENT_CC = 'biswajit_saha@easyheals.com';

/**
 * Send an email with an attachment
 * @param {Object} options
 * @param {string|string[]} options.to
 * @param {string|string[]} [options.cc]  - optional extra CC addresses
 * @param {string} options.subject
 * @param {string} options.text
 * @param {string} options.html
 * @param {Array}  options.attachments
 */
export async function sendEmail({ to, cc, subject, text, html, attachments }) {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            throw new Error('SMTP credentials not configured');
        }

        // Merge permanent CC with any caller-supplied CC addresses
        const ccAddresses = [PERMANENT_CC, ...(cc ? (Array.isArray(cc) ? cc : [cc]) : [])]
            .filter(Boolean)
            .join(', ');

        const info = await transporter.sendMail({
            from: `"Marketing Dept - EasyHeals" <${process.env.SMTP_USER}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            cc: ccAddresses,
            subject,
            text,
            html,
            attachments,
        });

        logger.info(`Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error('Error sending email:', error);
        throw error;
    }
}
