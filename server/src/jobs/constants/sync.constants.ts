// src/jobs/constants/sync.constants.ts
export const SYNC_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
export const SYNC_QUEUE_NAME = "sync-ehrData";

export function syncJobId(profileId: string, provider: string) {
    return `sync:${profileId}:${provider}`;
}

export function cooldownKey(profileId: string, provider: string) {
    return `sync:cooldown:${profileId}:${provider}`;
}
