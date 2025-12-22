import crypto from "crypto";
import redisClient from "../config/redis.config";
import {
  signupOtpKey,
  otpAttemptsKey,
  otpFreezeKey,
  otpResendKey,
} from "./redisKeys";

const OTP_TTL = 180; // 3 minutes
const ATTEMPTS_TTL = 300; // 5 minutes sliding window
const FREEZE_TTL = 900; // 15 minutes
const RESEND_MAX = 5;
const RESEND_WINDOW = 3600; // 1 hour

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const hashOtp = (otp: string, sessionId: string): string => {
  return crypto.createHmac("sha256", sessionId).update(otp).digest("hex");
};

export const storeOtp = async (
  sessionId: string,
  otpHash: string
): Promise<void> => {
  // Stores: signup:otp:<sessionId> → { otp_hash }
  await redisClient.set(
    signupOtpKey(sessionId),
    JSON.stringify({ otp_hash: otpHash }),
    "EX",
    OTP_TTL
  );
};

export const getStoredOtp = async (
  sessionId: string
): Promise<string | null> => {
  const data = await redisClient.get(signupOtpKey(sessionId));
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    return parsed.otp_hash;
  } catch {
    return null;
  }
};

export const deleteOtp = async (sessionId: string): Promise<void> => {
  await redisClient.del(signupOtpKey(sessionId));
};

export const incrementAttempts = async (email: string): Promise<number> => {
  const key = otpAttemptsKey(email);
  const attempts = await redisClient.incr(key);
  // Sliding window: refresh TTL on every increment
  await redisClient.expire(key, ATTEMPTS_TTL);
  return attempts;
};

export const getAttempts = async (email: string): Promise<number> => {
  const attempts = await redisClient.get(otpAttemptsKey(email));
  return attempts ? parseInt(attempts, 10) : 0;
};

export const deleteAttempts = async (email: string): Promise<void> => {
  await redisClient.del(otpAttemptsKey(email));
};

export const setFreeze = async (email: string): Promise<void> => {
  await redisClient.set(otpFreezeKey(email), "1", "EX", FREEZE_TTL);
};

export const isFrozen = async (email: string): Promise<boolean> => {
  const exists = await redisClient.exists(otpFreezeKey(email));
  return exists === 1;
};

export const getFreezeTtl = async (email: string): Promise<number> => {
  return await redisClient.ttl(otpFreezeKey(email));
};

export const canResend = async (email: string): Promise<boolean> => {
  const key = otpResendKey(email);
  const count = await redisClient.get(key);
  if (!count) return true;
  return parseInt(count, 10) < RESEND_MAX;
};

export const markResend = async (email: string): Promise<void> => {
  const key = otpResendKey(email);
  const count = await redisClient.incr(key);
  if (count === 1) {
    await redisClient.expire(key, RESEND_WINDOW);
  }
};

export const removeFreeze = async (email: string): Promise<void> => {
  await redisClient.del(otpFreezeKey(email));
};
