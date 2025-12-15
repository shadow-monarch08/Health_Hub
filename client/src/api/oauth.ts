import { config } from '../config';
import { apiClient } from './client';

export const oauthApi = {
    authorize: async (profileId: string) => {
        return apiClient(`${config.endpoints.oauth.authorize}?profileId=${profileId}`);
    }
};
