export const generateVerificationEmail = (user: any, token: string) => {
    return {
        subject: 'Verify your email',
        html: `<p>Please verify your email using this token: ${token}</p>`, // Placeholder
    };
};
