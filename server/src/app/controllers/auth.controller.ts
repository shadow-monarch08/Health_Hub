import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { signupSchema, verifyOtpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../utils/validation/auth.schema';
import { z } from 'zod';

export class AuthController {
    signup = async (req: Request, res: Response) => {
        try {
            const data = signupSchema.parse(req.body);
            const result = await authService.signup(data);
            res.status(201).json(result);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Validation Error', details: error.message });
            }
            if (error.message === 'USER_ALREADY_EXISTS') {
                return res.status(409).json({ error: 'User already exists' });
            }
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error: ' + error.message });
        }
    };

    verifyOtp = async (req: Request, res: Response) => {
        try {
            const data = verifyOtpSchema.parse(req.body);
            const result = await authService.verifyOtp(data);
            res.status(200).json(result);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Validation Error', details: error.message });
            }
            if (error.message === 'USER_NOT_FOUND') {
                return res.status(404).json({ error: 'User not found' });
            }
            if (error.message === 'EMAIL_ALREADY_VERIFIED') {
                return res.status(400).json({ error: 'Email already verified' }); // Use 400 or 409
            }
            if (error.message === 'OTP_INVALID') {
                return res.status(400).json({ error: 'Invalid OTP' });
            }
            if (error.message === 'OTP_EXPIRED') {
                return res.status(400).json({ error: 'OTP expired' });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    };

    login = async (req: Request, res: Response) => {
        try {
            const data = loginSchema.parse(req.body);
            const result = await authService.login(data);
            res.status(200).json(result);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Validation Error', details: error.message });
            }
            if (error.message === 'INVALID_CREDENTIALS') {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            if (error.message === 'EMAIL_NOT_VERIFIED') {
                return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED', action: 'RESEND_OTP' });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    };

    forgotPassword = async (req: Request, res: Response) => {
        try {
            const data = forgotPasswordSchema.parse(req.body);
            const result = await authService.forgotPassword(data);
            res.status(200).json(result);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Validation Error', details: error.message });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    };

    resetPassword = async (req: Request, res: Response) => {
        try {
            const data = resetPasswordSchema.parse(req.body);
            const result = await authService.resetPassword(data);
            res.status(200).json(result);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Validation Error', details: error.message });
            }
            if (error.message === 'INVALID_TOKEN' || error.message === 'RESET_TOKEN_EXPIRED') {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Internal Server Error' });
        }
    };

    me = async (req: Request, res: Response) => {
        // User is attached to req by middleware
        // @ts-ignore
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Sanitize
        const { passwordHash, verificationToken, resetToken, ...sanitizedUser } = user;
        res.status(200).json(sanitizedUser);
    }
}

export const authController = new AuthController();
