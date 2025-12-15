import { config } from '../config';
import { apiClient } from './client';

export const ehrApi = {
    fetchResource: async (profileId: string, resourceType: string) => {
        return apiClient(`${config.endpoints.ehr}/${resourceType}?profileId=${profileId}`);
    }
};
