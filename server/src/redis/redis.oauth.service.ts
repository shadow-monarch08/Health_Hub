import redisClient from './redisClient';

const NAMESPACE = 'oauth:state:';
const EXPIRE_SECONDS = 600; // 10 minutes

interface OAuthState {
    userId: string;
    profileId: string;
    provider: string;
    codeVerifier?: string;
}

export const saveState = async (state: string, data: OAuthState) => {
    await redisClient.set(`${NAMESPACE}${state}`, JSON.stringify(data), 'EX', EXPIRE_SECONDS);
};

export const getState = async (state: string): Promise<OAuthState | null> => {
    const data = await redisClient.get(`${NAMESPACE}${state}`);
    if (!data) return null;
    return JSON.parse(data);
};

export const deleteState = async (state: string) => {
    await redisClient.del(`${NAMESPACE}${state}`);
};
