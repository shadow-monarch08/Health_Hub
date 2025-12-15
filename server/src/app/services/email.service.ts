import nodemailer from 'nodemailer';
import { env } from '../../config/environment';
import { generateVerificationEmail } from '../utils/email/templates/verificationEmail';
import { generatePasswordResetEmail } from '../utils/email/templates/passwordResetEmail';

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail', // Or use environment variables for host/port
            auth: {
                user: env.EMAIL_USER,
                pass: env.EMAIL_PASSWORD,
            },
        });
    }

    async sendVerificationOtp(email: string, otp: string) {
        const { subject, html } = generateVerificationEmail(null, otp);

        await this.transporter.sendMail({
            from: env.EMAIL_USER,
            to: email,
            subject,
            html,
        });
    }

    async sendPasswordResetEmail(email: string, token: string) {
        const { subject, html } = generatePasswordResetEmail(null, token);

        await this.transporter.sendMail({
            from: env.EMAIL_USER,
            to: email,
            subject,
            html,
        });
    }
}

export const emailService = new EmailService();
