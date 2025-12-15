"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.verifyOtpSchema = exports.signupSchema = void 0;
const zod_1 = require("zod");
exports.signupSchema = zod_1.z.object({
    email: zod_1.z.email(),
    password: zod_1.z.string().min(8),
    name: zod_1.z.string().optional(),
});
exports.verifyOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    otp: zod_1.z.string().length(6),
    sessionId: zod_1.z.string(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.email(),
    password: zod_1.z.string(),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.email(),
});
exports.resetPasswordSchema = zod_1.z.object({
    email: zod_1.z.email(),
    otp: zod_1.z.string().optional(), // In some flows OTP is used, but here we use token link usually. But instruction said "Verify resetToken matches". 
    // Wait, instruction says "Step 2 - POST /auth/reset-password". Process: Validate input, Fetch user by email, Verify resetToken matches.
    // Ideally reset password usually takes a token. The instruction implies token might be passed in body or query?
    // "Verify resetToken matches".
    // Let's assume input body has email, token, newPassword.
    token: zod_1.z.string(),
    newPassword: zod_1.z.string().min(8),
});
