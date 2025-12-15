"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const client_1 = require("../../../generated/prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const email_service_1 = require("./email.service");
const environment_1 = require("../../config/environment");
const otpService = __importStar(require("../../redis/otpService"));
const sessionService = __importStar(require("../../redis/sessionService"));
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const connectionString = environment_1.env.DB_URL;
const adapter = new adapter_pg_1.PrismaPg({ connectionString });
const prisma = new client_1.PrismaClient({ adapter });
class AuthService {
    signup(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, password, name } = data;
            // 1. Check DB
            const existingUser = yield prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                if (existingUser.emailVerified) {
                    throw new Error('USER_ALREADY_EXISTS');
                }
                // If exists but unverified, we treat it as a resend/new signup flow (clean up old state by using new session)
            }
            // 2 & 3. Check Freeze & Resend Limit
            if (yield otpService.isFrozen(email)) {
                const ttl = yield otpService.getFreezeTtl(email);
                throw new Error(`Account frozen. Try again in ${Math.ceil(ttl / 60)} minutes.`);
            }
            if (!(yield otpService.canResend(email))) {
                throw new Error('Too many resend attempts. Try again later.');
            }
            // 4. Generate Session
            const sessionId = (0, uuid_1.v4)();
            const hashedPassword = yield bcrypt_1.default.hash(password, 10);
            yield sessionService.createSignupSession(sessionId, {
                email,
                status: 'OTP_PENDING',
                name,
                passwordHash: hashedPassword
            });
            // 5. Generate & Store OTP
            const otp = otpService.generateOtp();
            const otpHash = otpService.hashOtp(otp, sessionId);
            yield otpService.storeOtp(sessionId, otpHash);
            // 6. Send Email
            yield email_service_1.emailService.sendVerificationOtp(email, otp);
            yield otpService.markResend(email);
            return { sessionId, message: 'OTP sent to your email. Please verify to continue.' };
        });
    }
    verifyOtp(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { sessionId, otp } = data;
            // 2. Load signup session
            const session = yield sessionService.getSignupSession(sessionId);
            if (!session) {
                throw new Error('SESSION_EXPIRED_OR_INVALID');
            }
            const email = session.email;
            // 3. Check freeze key
            if (yield otpService.isFrozen(email)) {
                const ttl = yield otpService.getFreezeTtl(email);
                throw new Error(`Account frozen. Try again in ${Math.ceil(ttl / 60)} minutes.`);
            }
            // 4. Load OTP hash
            const storedOtpHash = yield otpService.getStoredOtp(sessionId);
            if (!storedOtpHash) {
                throw new Error('OTP_EXPIRED');
            }
            // 5. Compare Hash
            const inputHash = otpService.hashOtp(otp, sessionId);
            // Timing-safe comparison using crypto (simulated for hex strings)
            // Since we are comparing hex strings, a constant-time comparison prevents timing attacks.
            const a = Buffer.from(inputHash);
            const b = Buffer.from(storedOtpHash);
            const valid = a.length === b.length && crypto_1.default.timingSafeEqual(a, b);
            if (valid) {
                // 6. Valid
                yield sessionService.markSessionVerified(sessionId);
                yield otpService.deleteAttempts(email);
                yield otpService.removeFreeze(email);
                // Create or Update User
                const existingUser = yield prisma.user.findUnique({ where: { email } });
                let user;
                if (existingUser) {
                    user = yield prisma.user.update({
                        where: { email },
                        data: { emailVerified: true }
                    });
                }
                else {
                    if (!session.passwordHash) {
                        // Should not happen if signup flow was followed
                        throw new Error('SESSION_DATA_MISSING');
                    }
                    user = yield prisma.user.create({
                        data: {
                            email,
                            passwordHash: session.passwordHash,
                            name: session.name,
                            emailVerified: true
                        }
                    });
                }
                // Delete OTP key & Session
                yield otpService.deleteOtp(sessionId);
                yield sessionService.deleteSignupSession(sessionId);
                const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', {
                    expiresIn: '7d',
                });
                return { token, user };
            }
            else {
                // 7. Invalid
                const attempts = yield otpService.incrementAttempts(email);
                if (attempts >= 3) {
                    yield otpService.setFreeze(email);
                    yield sessionService.deleteSignupSession(sessionId);
                    yield otpService.deleteOtp(sessionId);
                    throw new Error('ACCOUNT_LOCKED');
                }
                throw new Error('OTP_INVALID');
            }
        });
    }
    login(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma.user.findUnique({ where: { email: data.email } });
            if (!user) {
                throw new Error('INVALID_CREDENTIALS');
            }
            if (!user.emailVerified) {
                throw new Error('EMAIL_NOT_VERIFIED');
            }
            if (!user.passwordHash) {
                throw new Error('INVALID_CREDENTIALS');
            }
            const isPasswordValid = yield bcrypt_1.default.compare(data.password, user.passwordHash);
            if (!isPasswordValid) {
                throw new Error('INVALID_CREDENTIALS');
            }
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', {
                expiresIn: '7d',
            });
            return { token, user };
        });
    }
    forgotPassword(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma.user.findUnique({ where: { email: data.email } });
            if (user) {
                const resetToken = otpService.generateOtp();
                yield prisma.user.update({
                    where: { email: data.email },
                    data: {
                        resetToken: resetToken,
                        resetExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
                    },
                });
                yield email_service_1.emailService.sendPasswordResetEmail(data.email, resetToken);
            }
            return { message: 'If an account exists, a password reset email has been sent.' };
        });
    }
    resetPassword(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prisma.user.findUnique({ where: { email: data.email } });
            if (!user) {
                throw new Error('INVALID_TOKEN');
            }
            if (user.resetToken !== data.token) {
                throw new Error('INVALID_TOKEN');
            }
            if (!user.resetExpiresAt || user.resetExpiresAt < new Date()) {
                throw new Error('RESET_TOKEN_EXPIRED');
            }
            const hashedPassword = yield bcrypt_1.default.hash(data.newPassword, 10);
            yield prisma.user.update({
                where: { email: data.email },
                data: {
                    passwordHash: hashedPassword,
                    resetToken: null,
                    resetExpiresAt: null,
                },
            });
            return { message: 'Password has been reset successfully.' };
        });
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
