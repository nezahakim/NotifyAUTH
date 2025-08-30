// src/lib/server/email.ts
import { EMAIL_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from '$env/static/private';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
});

export async function sendMagicLink(email: string, link: string, purpose: 'login' | 'reset_password') {
    const subject = purpose === 'login' ? 'Your Magic Login Link' : 'Reset Your Password';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${subject}</h2>
            <p>Click the link below to ${purpose === 'login' ? 'log in' : 'reset your password'}:</p>
            <a href="${link}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
                ${purpose === 'login' ? 'Log In' : 'Reset Password'}
            </a>
            <p style="margin-top: 20px; color: #666;">This link will expire in 15 minutes.</p>
            <p style="color: #666;">If you didn't request this, please ignore this email.</p>
        </div>
    `;

    await transporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject,
        html
    });
}