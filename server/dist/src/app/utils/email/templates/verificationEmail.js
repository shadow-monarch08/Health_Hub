"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVerificationEmail = void 0;
const generateVerificationEmail = (user, token) => {
    return {
        subject: 'Verify your email',
        html: `<p>Please verify your email using this token: ${token}</p>`, // Placeholder
    };
};
exports.generateVerificationEmail = generateVerificationEmail;
