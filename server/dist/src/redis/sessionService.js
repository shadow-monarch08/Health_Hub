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
exports.deleteSignupSession = exports.markSessionVerified = exports.getSignupSession = exports.createSignupSession = void 0;
const redisClient_1 = __importDefault(require("./redisClient"));
const redisKeys_1 = require("./redisKeys");
const SESSION_TTL = 600; // 10 minutes
const createSignupSession = (sessionId, sessionData) => __awaiter(void 0, void 0, void 0, function* () {
    yield redisClient_1.default.set((0, redisKeys_1.signupSessionKey)(sessionId), JSON.stringify(sessionData), 'EX', SESSION_TTL);
});
exports.createSignupSession = createSignupSession;
const getSignupSession = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield redisClient_1.default.get((0, redisKeys_1.signupSessionKey)(sessionId));
    if (!data)
        return null;
    try {
        return JSON.parse(data);
    }
    catch (_a) {
        return null;
    }
});
exports.getSignupSession = getSignupSession;
const markSessionVerified = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield (0, exports.getSignupSession)(sessionId);
    if (session) {
        session.status = 'VERIFIED';
        yield redisClient_1.default.set((0, redisKeys_1.signupSessionKey)(sessionId), JSON.stringify(session), 'EX', SESSION_TTL);
    }
});
exports.markSessionVerified = markSessionVerified;
const deleteSignupSession = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    yield redisClient_1.default.del((0, redisKeys_1.signupSessionKey)(sessionId));
});
exports.deleteSignupSession = deleteSignupSession;
