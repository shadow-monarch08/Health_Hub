import prisma from "../../config/prisma.config";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { emailService } from "./email.service";
import {
  signupSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../utils/validation/auth.schema";
import { z } from "zod";
import { env } from "../../config/environment.config";
import * as otpService from "../../redis/otpService";
import * as sessionService from "../../redis/sessionService";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export class AuthService {
  async signup(data: z.infer<typeof signupSchema>) {
    const { email, password, name } = data;

    // 1. Check DB
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new Error("USER_ALREADY_EXISTS");
      }
      // If exists but unverified, we treat it as a resend/new signup flow (clean up old state by using new session)
    }

    // 2 & 3. Check Freeze & Resend Limit
    if (await otpService.isFrozen(email)) {
      const ttl = await otpService.getFreezeTtl(email);
      throw new Error(
        `Account frozen. Try again in ${Math.ceil(ttl / 60)} minutes.`
      );
    }
    if (!(await otpService.canResend(email))) {
      throw new Error("Too many resend attempts. Try again later.");
    }

    // 4. Generate Session
    const sessionId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    await sessionService.createSignupSession(sessionId, {
      email,
      status: "OTP_PENDING",
      name,
      passwordHash: hashedPassword,
    });

    // 5. Generate & Store OTP
    const otp = otpService.generateOtp();
    const otpHash = otpService.hashOtp(otp, sessionId);
    await otpService.storeOtp(sessionId, otpHash);

    // 6. Send Email
    await emailService.sendVerificationOtp(email, otp);
    await otpService.markResend(email);

    return {
      sessionId,
      message: "OTP sent to your email. Please verify to continue.",
    };
  }

  async verifyOtp(data: z.infer<typeof verifyOtpSchema>) {
    const { sessionId, otp } = data;

    // 2. Load signup session
    const session = await sessionService.getSignupSession(sessionId);
    if (!session) {
      throw new Error("SESSION_EXPIRED_OR_INVALID");
    }

    const email = session.email;

    // 3. Check freeze key
    if (await otpService.isFrozen(email)) {
      const ttl = await otpService.getFreezeTtl(email);
      throw new Error(
        `Account frozen. Try again in ${Math.ceil(ttl / 60)} minutes.`
      );
    }

    // 4. Load OTP hash
    const storedOtpHash = await otpService.getStoredOtp(sessionId);
    if (!storedOtpHash) {
      throw new Error("OTP_EXPIRED");
    }

    // 5. Compare Hash
    const inputHash = otpService.hashOtp(otp, sessionId);

    // Timing-safe comparison using crypto (simulated for hex strings)
    // Since we are comparing hex strings, a constant-time comparison prevents timing attacks.
    const a = Buffer.from(inputHash);
    const b = Buffer.from(storedOtpHash);
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (valid) {
      // 6. Valid
      await sessionService.markSessionVerified(sessionId);
      await otpService.deleteAttempts(email);
      await otpService.removeFreeze(email);

      // Create or Update User
      const existingUser = await prisma.user.findUnique({ where: { email } });
      let user;

      if (existingUser) {
        user = await prisma.user.update({
          where: { email },
          data: { emailVerified: true },
        });
      } else {
        if (!session.passwordHash) {
          // Should not happen if signup flow was followed
          throw new Error("SESSION_DATA_MISSING");
        }
        user = await prisma.user.create({
          data: {
            email,
            passwordHash: session.passwordHash,
            name: session.name,
            emailVerified: true,
          },
        });
      }

      // Delete OTP key & Session
      await otpService.deleteOtp(sessionId);
      await sessionService.deleteSignupSession(sessionId);

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || "secret",
        {
          expiresIn: "7d",
        }
      );

      return { token, user };
    } else {
      // 7. Invalid
      const attempts = await otpService.incrementAttempts(email);
      if (attempts >= 3) {
        await otpService.setFreeze(email);
        await sessionService.deleteSignupSession(sessionId);
        await otpService.deleteOtp(sessionId);
        throw new Error("ACCOUNT_LOCKED");
      }
      throw new Error("OTP_INVALID");
    }
  }

  async login(data: z.infer<typeof loginSchema>) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (!user.emailVerified) {
      throw new Error("EMAIL_NOT_VERIFIED");
    }

    if (!user.passwordHash) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "secret",
      {
        expiresIn: "7d",
      }
    );

    return { token, user };
  }

  async forgotPassword(data: z.infer<typeof forgotPasswordSchema>) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (user) {
      const resetToken = otpService.generateOtp();

      await prisma.user.update({
        where: { email: data.email },
        data: {
          resetToken: resetToken,
          resetExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
        },
      });

      await emailService.sendPasswordResetEmail(data.email, resetToken);
    }

    return {
      message: "If an account exists, a password reset email has been sent.",
    };
  }

  async resetPassword(data: z.infer<typeof resetPasswordSchema>) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      throw new Error("INVALID_TOKEN");
    }

    if (user.resetToken !== data.token) {
      throw new Error("INVALID_TOKEN");
    }

    if (!user.resetExpiresAt || user.resetExpiresAt < new Date()) {
      throw new Error("RESET_TOKEN_EXPIRED");
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { email: data.email },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetExpiresAt: null,
      },
    });

    return { message: "Password has been reset successfully." };
  }
}

export const authService = new AuthService();
