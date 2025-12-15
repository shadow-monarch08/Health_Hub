import { z } from 'zod';

export const signupSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
    name: z.string().optional(),
});

export const verifyOtpSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    sessionId: z.string(),
});

export const loginSchema = z.object({
    email: z.email(),
    password: z.string(),
});

export const forgotPasswordSchema = z.object({
    email: z.email(),
});

export const resetPasswordSchema = z.object({
    email: z.email(),
    otp: z.string().optional(), // In some flows OTP is used, but here we use token link usually. But instruction said "Verify resetToken matches". 
    // Wait, instruction says "Step 2 - POST /auth/reset-password". Process: Validate input, Fetch user by email, Verify resetToken matches.
    // Ideally reset password usually takes a token. The instruction implies token might be passed in body or query?
    // "Verify resetToken matches".
    // Let's assume input body has email, token, newPassword.
    token: z.string(),
    newPassword: z.string().min(8),
});
