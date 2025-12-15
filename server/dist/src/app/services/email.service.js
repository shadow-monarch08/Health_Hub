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
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const environment_1 = require("../../config/environment");
const verificationEmail_1 = require("../utils/email/templates/verificationEmail");
const passwordResetEmail_1 = require("../utils/email/templates/passwordResetEmail");
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            service: 'gmail', // Or use environment variables for host/port
            auth: {
                user: environment_1.env.EMAIL_USER,
                pass: environment_1.env.EMAIL_PASSWORD,
            },
        });
    }
    sendVerificationOtp(email, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            const { subject, html } = (0, verificationEmail_1.generateVerificationEmail)(null, otp);
            yield this.transporter.sendMail({
                from: environment_1.env.EMAIL_USER,
                to: email,
                subject,
                html,
            });
        });
    }
    sendPasswordResetEmail(email, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const { subject, html } = (0, passwordResetEmail_1.generatePasswordResetEmail)(null, token);
            yield this.transporter.sendMail({
                from: environment_1.env.EMAIL_USER,
                to: email,
                subject,
                html,
            });
        });
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
