
const API_BASE_URL = 'https://dirgelike-superartificially-rachelle.ngrok-free.dev/api/v1';

export const config = {
    endpoints: {
        auth: {
            signup: `${API_BASE_URL}/auth/signup`,
            login: `${API_BASE_URL}/auth/login`,
            verifyOtp: `${API_BASE_URL}/auth/verify-otp`,
            me: `${API_BASE_URL}/auth/me`
        },
        profile: {
            base: `${API_BASE_URL}/profiles`
        },
        oauth: {
            authorize: `${API_BASE_URL}/OAuth/epic/authorize`
        },
        ehr: `${API_BASE_URL}/ehr`,
    },
};
