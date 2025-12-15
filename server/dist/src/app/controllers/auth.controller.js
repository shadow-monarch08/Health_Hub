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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const auth_schema_1 = require("../utils/validation/auth.schema");
const zod_1 = require("zod");
class AuthController {
    constructor() {
        this.signup = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const data = auth_schema_1.signupSchema.parse(req.body);
                const result = yield auth_service_1.authService.signup(data);
                res.status(201).json(result);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    return res.status(400).json({ error: 'Validation Error', details: error.message });
                }
                if (error.message === 'USER_ALREADY_EXISTS') {
                    return res.status(409).json({ error: 'User already exists' });
                }
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error: ' + error.message });
            }
        });
        this.verifyOtp = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const data = auth_schema_1.verifyOtpSchema.parse(req.body);
                const result = yield auth_service_1.authService.verifyOtp(data);
                res.status(200).json(result);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    return res.status(400).json({ error: 'Validation Error', details: error.message });
                }
                if (error.message === 'USER_NOT_FOUND') {
                    return res.status(404).json({ error: 'User not found' });
                }
                if (error.message === 'EMAIL_ALREADY_VERIFIED') {
                    return res.status(400).json({ error: 'Email already verified' }); // Use 400 or 409
                }
                if (error.message === 'OTP_INVALID') {
                    return res.status(400).json({ error: 'Invalid OTP' });
                }
                if (error.message === 'OTP_EXPIRED') {
                    return res.status(400).json({ error: 'OTP expired' });
                }
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
        this.login = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const data = auth_schema_1.loginSchema.parse(req.body);
                const result = yield auth_service_1.authService.login(data);
                res.status(200).json(result);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    return res.status(400).json({ error: 'Validation Error', details: error.message });
                }
                if (error.message === 'INVALID_CREDENTIALS') {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
                if (error.message === 'EMAIL_NOT_VERIFIED') {
                    return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED', action: 'RESEND_OTP' });
                }
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
        this.forgotPassword = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const data = auth_schema_1.forgotPasswordSchema.parse(req.body);
                const result = yield auth_service_1.authService.forgotPassword(data);
                res.status(200).json(result);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    return res.status(400).json({ error: 'Validation Error', details: error.message });
                }
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
        this.resetPassword = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const data = auth_schema_1.resetPasswordSchema.parse(req.body);
                const result = yield auth_service_1.authService.resetPassword(data);
                res.status(200).json(result);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    return res.status(400).json({ error: 'Validation Error', details: error.message });
                }
                if (error.message === 'INVALID_TOKEN' || error.message === 'RESET_TOKEN_EXPIRED') {
                    return res.status(400).json({ error: error.message });
                }
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
        this.me = (req, res) => __awaiter(this, void 0, void 0, function* () {
            // User is attached to req by middleware
            // @ts-ignore
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Sanitize
            const { passwordHash, verificationToken, resetToken } = user, sanitizedUser = __rest(user, ["passwordHash", "verificationToken", "resetToken"]);
            res.status(200).json(sanitizedUser);
        });
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
