import { config } from '../config';
import { apiClient, setAuthToken } from './client';

export const authApi = {
    signup: async (email: string, name: string, password: string) => {
        return apiClient(config.endpoints.auth.signup, {
            method: 'POST',
            body: JSON.stringify({ email, name, password }),
        });
    },

    login: async (email: string, password: string) => {
        const res = await apiClient(config.endpoints.auth.login, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (res.token) {
            setAuthToken(res.token);
        }
        return res;
    },

    verifyOtp: async (email: string, otp: string, sessionId: string) => {
        const res = await apiClient(config.endpoints.auth.verifyOtp, {
            method: 'POST',
            body: JSON.stringify({ email, otp, sessionId }),
        });
        if (res.token) {
            setAuthToken(res.token);
        }
        return res;
    },

    me: async () => {
        return apiClient(config.endpoints.auth.me);
    }
};
