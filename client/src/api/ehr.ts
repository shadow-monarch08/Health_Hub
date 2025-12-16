import { config } from '../config';
import { apiClient } from './client';

export const ehrApi = {
    fetchResource: async (profileId: string, resourceType: string, mode?: 'raw' | 'clean') => {
        let url = `${config.endpoints.ehr}/${resourceType}?profileId=${profileId}`;
        if (mode) {
            url += `&mode=${mode}`;
        }
        return apiClient(url);
    },
    sync: async (profileId: string) => {
        return apiClient(`${config.endpoints.ehr}/sync`, {
            method: 'POST',
            body: JSON.stringify({ profileId })
        });
    }
};
