export const generatePasswordResetEmail = (user: any, token: string) => {
    return {
        subject: 'Reset your password',
        html: `<p>Use this token to reset your password: ${token}</p>`, // Placeholder
    };
};
