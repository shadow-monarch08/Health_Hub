
export interface CleanRecord {
    resourceType: string;
    cleanJson: any;
    sources: { provider: string; raw_id: string; fetchedAt: Date }[];
}

export interface NormalizedRecord {
    resourceType: string;
    resourceId: string;
    normalizedJson: any;
    canonicalCode: string | null;
    provider: string;
    normalizedAt: Date;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    patient?: string;
    refresh_token?: string;
    id_token?: string;
}

export interface EhrAuthProvider {
    createAuthorizationRedirect(userId: string, profileId: string): Promise<string>;
    exchangeCodeForToken(state: string, code: string): Promise<{ token: TokenResponse; stateData: any }>;
}

export interface EhrProvider {
    /**
     * Main entry point to sync data for a profile.
     * Handles fetching, normalizing, and cleaning.
     */
    sync(profileId: string, jobId?: string): Promise<void>;

    /**
     * Fetches raw data from the provider.
     * Implementation may store raw data to DB.
     */
    fetch(profileId: string): Promise<void>;

    /**
     * Normalizes raw data into a standard format.
     */
    normalize(rawData: any[]): NormalizedRecord[];

    /**
     * Cleans/Aggregates normalized data into a summary.
     */
    clean(normalizedData: NormalizedRecord[]): CleanRecord[];

    /**
     * OAuth handlers
     */
    auth: EhrAuthProvider;
}
