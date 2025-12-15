import { config } from '../config';
import { apiClient } from './client';

export interface Profile {
    id: string;
    userId: string;
    displayName: string;
    relationship: string;
    emrConnections?: any[]; // Simplified for now
}

export const profileApi = {
    create: async (data: { displayName: string; relationship: string; dob?: string; legalName?: string }) => {
        return apiClient(config.endpoints.profile.base, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    list: async (): Promise<Profile[]> => {
        const res = await apiClient(config.endpoints.profile.base);
        return res || [];
    }
};
