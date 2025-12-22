import redisClient from "../config/redis.config";
import { signupSessionKey } from "./redisKeys";

const SESSION_TTL = 600; // 10 minutes

export interface SignupSession {
  email: string;
  status: "OTP_PENDING" | "VERIFIED";
  name?: string;
  passwordHash?: string;
}

export const createSignupSession = async (
  sessionId: string,
  sessionData: SignupSession
): Promise<void> => {
  await redisClient.set(
    signupSessionKey(sessionId),
    JSON.stringify(sessionData),
    "EX",
    SESSION_TTL
  );
};

export const getSignupSession = async (
  sessionId: string
): Promise<SignupSession | null> => {
  const data = await redisClient.get(signupSessionKey(sessionId));
  if (!data) return null;
  try {
    return JSON.parse(data) as SignupSession;
  } catch {
    return null;
  }
};

export const markSessionVerified = async (sessionId: string): Promise<void> => {
  const session = await getSignupSession(sessionId);
  if (session) {
    session.status = "VERIFIED";
    await redisClient.set(
      signupSessionKey(sessionId),
      JSON.stringify(session),
      "EX",
      SESSION_TTL
    );
  }
};

export const deleteSignupSession = async (sessionId: string): Promise<void> => {
  await redisClient.del(signupSessionKey(sessionId));
};
