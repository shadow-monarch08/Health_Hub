"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePasswordResetEmail = void 0;
const generatePasswordResetEmail = (user, token) => {
    return {
        subject: 'Reset your password',
        html: `<p>Use this token to reset your password: ${token}</p>`, // Placeholder
    };
};
exports.generatePasswordResetEmail = generatePasswordResetEmail;
