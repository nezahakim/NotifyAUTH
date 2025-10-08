// // src/lib/server/email.ts
// import { EMAIL_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from '$env/static/private';
// import nodemailer from 'nodemailer';

// const transporter = nodemailer.createTransport({
//     host: SMTP_HOST,
//     port: parseInt(SMTP_PORT || '587'),
//     secure: false,
//     auth: {
//         user: SMTP_USER,
//         pass: SMTP_PASS
//     }
// });

// export async function sendMagicLink(
//     email: string,
//     link: string,
//     purpose: 'login' | 'reset_password' | 'code'
// ) {
//     let subject = '';
//     let heading = '';
//     let message = '';
//     let buttonLabel = '';

//     switch (purpose) {
//         case 'login':
//             subject = 'Sign in to your account';
//             heading = 'Welcome back!';
//             message = 'Click the button below to log in securely.';
//             buttonLabel = 'Log In';
//             break;
//         case 'reset_password':
//             subject = 'Reset your password';
//             heading = 'Reset Your Password';
//             message = 'Click the button below to create a new password. If you didn’t request this, you can ignore this email.';
//             buttonLabel = 'Reset Password';
//             break;
//         case 'code':
//             subject = 'Verify your email address';
//             heading = 'Email Verification';
//             message = 'Click the button below to verify your email address and continue.';
//             buttonLabel = 'Verify Email';
//             break;
//         default:
//             subject = 'Your secure link';
//             heading = 'Security Notification';
//             message = 'Click the button below to continue.';
//             buttonLabel = 'Continue';
//             break;
//     }

//     const html = `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f9f9f9; border-radius: 8px;">
//             <h2 style="color: #333;">${heading}</h2>
//             <p style="font-size: 16px; color: #555;">${message}</p>

//             <a href="${link}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px;">
//                 ${buttonLabel}
//             </a>

//             <p style="font-size: 14px; color: #888;">This link will expire in 15 minutes.</p>
//             <p style="font-size: 14px; color: #888;">If you didn’t request this, no action is needed.</p>
//         </div>
//     `;

//     await transporter.sendMail({
//         from: EMAIL_FROM,
//         to: email,
//         subject,
//         html
//     });
// }


// src/lib/server/email.ts
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import {
	RESEND_API_KEY,
	EMAIL_FROM,
	SMTP_HOST,
	SMTP_PORT,
	SMTP_USER,
	SMTP_PASS
} from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

const brevoTransporter = nodemailer.createTransport({
	host: SMTP_HOST,
	port: parseInt(SMTP_PORT || '587'),
	secure: false,
	auth: {
		user: SMTP_USER,
		pass: SMTP_PASS
	}
});

export async function sendMagicLink(
	email: string,
	link: string,
	purpose: 'login' | 'reset_password' | 'code'
) {
	let subject = '';
	let heading = '';
	let message = '';
	let buttonLabel = '';

	switch (purpose) {
		case 'login':
			subject = 'Sign in to your account';
			heading = 'Welcome back!';
			message = 'Click the button below to log in securely.';
			buttonLabel = 'Log In';
			break;
		case 'reset_password':
			subject = 'Reset your password';
			heading = 'Reset Your Password';
			message =
				'Click the button below to create a new password. If you didn’t request this, you can ignore this email.';
			buttonLabel = 'Reset Password';
			break;
		case 'code':
			subject = 'Verify your email address';
			heading = 'Email Verification';
			message = 'Click the button below to verify your email address and continue.';
			buttonLabel = 'Verify Email';
			break;
		default:
			subject = 'Your secure link';
			heading = 'Security Notification';
			message = 'Click the button below to continue.';
			buttonLabel = 'Continue';
			break;
	}

	const html = `
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f9f9f9; border-radius: 8px;">
			<h2 style="color: #333;">${heading}</h2>
			<p style="font-size: 16px; color: #555;">${message}</p>

			<a href="${link}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px;">
				${buttonLabel}
			</a>

			<p style="font-size: 14px; color: #888;">This link will expire in 15 minutes.</p>
			<p style="font-size: 14px; color: #888;">If you didn’t request this, no action is needed.</p>
		</div>
	`;

	// 🟢 1. Try Resend
	try {
		await resend.emails.send({
			from: EMAIL_FROM,
			to: email,
			subject,
			html
		});
		console.log('Email sent via Resend');
		return;
	} catch (err) {
		console.error('Resend failed:', err);
	}

	// 🔄 2. Fallback: Try Brevo SMTP
	try {
		await brevoTransporter.sendMail({
			from: EMAIL_FROM,
			to: email,
			subject,
			html
		});
		console.log('Email sent via Brevo (fallback)');
	} catch (smtpErr) {
		console.error('Brevo fallback failed:', smtpErr);
		throw new Error('Both Resend and Brevo failed to send email.');
	}
}
