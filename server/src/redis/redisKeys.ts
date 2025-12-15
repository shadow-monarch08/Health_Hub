export const signupSessionKey = (sessionId: string) => `signup:session:${sessionId}`;
export const signupOtpKey = (sessionId: string) => `signup:otp:${sessionId}`;
export const otpAttemptsKey = (email: string) => `signup:otp_attempts:${email}`;
export const otpFreezeKey = (email: string) => `signup:otp_freeze:${email}`;
export const otpResendKey = (email: string) => `signup:otp_resend:${email}`;
export const epicPkce = (state: string) => `epic:pkce:${state}`;
