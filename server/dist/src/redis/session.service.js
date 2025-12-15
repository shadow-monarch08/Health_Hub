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
exports.SessionService = void 0;
const redisClient_1 = __importDefault(require("./redisClient"));
const redisKeys_1 = require("./redisKeys");
class SessionService {
    static createSignupSession(sessionId, email) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.signupSessionKey(sessionId);
            yield redisClient_1.default.setex(key, this.SESSION_TTL_SECONDS, JSON.stringify({ email, status: 'OTP_PENDING' }));
        });
    }
    static getSignupSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.signupSessionKey(sessionId);
            const data = yield redisClient_1.default.get(key);
            if (!data)
                return null;
            return JSON.parse(data);
        });
    }
    static markSessionVerified(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.signupSessionKey(sessionId);
            const sessionFn = yield this.getSignupSession(sessionId);
            if (sessionFn) {
                yield redisClient_1.default.setex(key, this.SESSION_TTL_SECONDS, JSON.stringify(Object.assign(Object.assign({}, sessionFn), { status: 'VERIFIED' })));
            }
        });
    }
    static deleteSignupSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = redisKeys_1.redisKeys.signupSessionKey(sessionId);
            yield redisClient_1.default.del(key);
        });
    }
}
exports.SessionService = SessionService;
SessionService.SESSION_TTL_SECONDS = 10 * 60; // 10 minutes
