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
exports.removeFreeze = exports.markResend = exports.canResend = exports.getFreezeTtl = exports.isFrozen = exports.setFreeze = exports.deleteAttempts = exports.getAttempts = exports.incrementAttempts = exports.deleteOtp = exports.getStoredOtp = exports.storeOtp = exports.hashOtp = exports.generateOtp = void 0;
const crypto_1 = __importDefault(require("crypto"));
const redisClient_1 = __importDefault(require("./redisClient"));
const redisKeys_1 = require("./redisKeys");
const OTP_TTL = 180; // 3 minutes
const ATTEMPTS_TTL = 300; // 5 minutes sliding window
const FREEZE_TTL = 900; // 15 minutes
const RESEND_MAX = 5;
const RESEND_WINDOW = 3600; // 1 hour
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOtp = generateOtp;
const hashOtp = (otp, sessionId) => {
    return crypto_1.default.createHmac('sha256', sessionId).update(otp).digest('hex');
};
exports.hashOtp = hashOtp;
const storeOtp = (sessionId, otpHash) => __awaiter(void 0, void 0, void 0, function* () {
    // Stores: signup:otp:<sessionId> → { otp_hash }
    yield redisClient_1.default.set((0, redisKeys_1.signupOtpKey)(sessionId), JSON.stringify({ otp_hash: otpHash }), 'EX', OTP_TTL);
});
exports.storeOtp = storeOtp;
const getStoredOtp = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield redisClient_1.default.get((0, redisKeys_1.signupOtpKey)(sessionId));
    if (!data)
        return null;
    try {
        const parsed = JSON.parse(data);
        return parsed.otp_hash;
    }
    catch (_a) {
        return null;
    }
});
exports.getStoredOtp = getStoredOtp;
const deleteOtp = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    yield redisClient_1.default.del((0, redisKeys_1.signupOtpKey)(sessionId));
});
exports.deleteOtp = deleteOtp;
const incrementAttempts = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const key = (0, redisKeys_1.otpAttemptsKey)(email);
    const attempts = yield redisClient_1.default.incr(key);
    // Sliding window: refresh TTL on every increment
    yield redisClient_1.default.expire(key, ATTEMPTS_TTL);
    return attempts;
});
exports.incrementAttempts = incrementAttempts;
const getAttempts = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const attempts = yield redisClient_1.default.get((0, redisKeys_1.otpAttemptsKey)(email));
    return attempts ? parseInt(attempts, 10) : 0;
});
exports.getAttempts = getAttempts;
const deleteAttempts = (email) => __awaiter(void 0, void 0, void 0, function* () {
    yield redisClient_1.default.del((0, redisKeys_1.otpAttemptsKey)(email));
});
exports.deleteAttempts = deleteAttempts;
const setFreeze = (email) => __awaiter(void 0, void 0, void 0, function* () {
    yield redisClient_1.default.set((0, redisKeys_1.otpFreezeKey)(email), '1', 'EX', FREEZE_TTL);
});
exports.setFreeze = setFreeze;
const isFrozen = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const exists = yield redisClient_1.default.exists((0, redisKeys_1.otpFreezeKey)(email));
    return exists === 1;
});
exports.isFrozen = isFrozen;
const getFreezeTtl = (email) => __awaiter(void 0, void 0, void 0, function* () {
    return yield redisClient_1.default.ttl((0, redisKeys_1.otpFreezeKey)(email));
});
exports.getFreezeTtl = getFreezeTtl;
const canResend = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const key = (0, redisKeys_1.otpResendKey)(email);
    const count = yield redisClient_1.default.get(key);
    if (!count)
        return true;
    return parseInt(count, 10) < RESEND_MAX;
});
exports.canResend = canResend;
const markResend = (email) => __awaiter(void 0, void 0, void 0, function* () {
    const key = (0, redisKeys_1.otpResendKey)(email);
    const count = yield redisClient_1.default.incr(key);
    if (count === 1) {
        yield redisClient_1.default.expire(key, RESEND_WINDOW);
    }
});
exports.markResend = markResend;
const removeFreeze = (email) => __awaiter(void 0, void 0, void 0, function* () {
    yield redisClient_1.default.del((0, redisKeys_1.otpFreezeKey)(email));
});
exports.removeFreeze = removeFreeze;
