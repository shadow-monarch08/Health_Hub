"use strict";
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
exports.OtpService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const redisClient_1 = __importDefault(require("./redisClient"));
const redisKeys_1 = require("./redisKeys");
class OtpService {
    static generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    static hashOtp(otp, sessionId) {
        return crypto_1.default
            .createHmac('sha256', sessionId)
            .update(otp)
            .digest('hex');
    }
    static storeOtp(sessionId, otpHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.signupOtpKey(sessionId);
            yield redisClient_1.default.setex(key, this.OTP_TTL_SECONDS, JSON.stringify({ otp_hash: otpHash }));
        });
    }
    static getStoredOtpHash(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.signupOtpKey(sessionId);
            const data = yield redisClient_1.default.get(key);
            if (!data)
                return null;
            return JSON.parse(data).otp_hash;
        });
    }
    static deleteOtp(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.signupOtpKey(sessionId);
            yield redisClient_1.default.del(key);
        });
    }
    static incrementAttempts(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.otpAttemptsKey(email);
            const attempts = yield redisClient_1.default.incr(key);
            if (attempts === 1) {
                yield redisClient_1.default.expire(key, this.ATTEMPTS_TTL_SECONDS);
            }
            return attempts;
        });
    }
    static clearAttempts(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.otpAttemptsKey(email);
            yield redisClient_1.default.del(key);
        });
    }
    static setFreeze(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.otpFreezeKey(email);
            yield redisClient_1.default.setex(key, this.FREEZE_TTL_SECONDS, 'FROZEN');
        });
    }
    static isFrozen(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.otpFreezeKey(email);
            const ttl = yield redisClient_1.default.ttl(key);
            return { frozen: ttl > 0, ttl: ttl > 0 ? ttl : 0 };
        });
    }
    static canResend(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.otpResendKey(email);
            const count = yield redisClient_1.default.get(key);
            return !count || parseInt(count, 10) < this.MAX_RESENDS_PER_HOUR;
        });
    }
    static markResend(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.otpResendKey(email);
            const count = yield redisClient_1.default.incr(key);
            if (count === 1) {
                yield redisClient_1.default.expire(key, this.RESEND_TTL_SECONDS);
            }
        });
    }
}
exports.OtpService = OtpService;
OtpService.OTP_TTL_SECONDS = 3 * 60; // 3 minutes
OtpService.ATTEMPTS_TTL_SECONDS = 5 * 60; // 5 minutes sliding window
OtpService.FREEZE_TTL_SECONDS = 15 * 60; // 15 minutes
OtpService.RESEND_TTL_SECONDS = 60 * 60; // 1 hour for rate limit
OtpService.MAX_ATTEMPTS = 3;
OtpService.MAX_RESENDS_PER_HOUR = 5;
