import { EhrProvider } from "./common/ehrProvider.interface";
import { EHR_CONSTANTS } from "./common/ehr.constants";
import { epicProvider } from "./epic/provider";
// import { athenaProvider } from "./athena/provider"; // TODO: Implement Athena

export class EhrRegistryService {
    private providers: Map<string, EhrProvider> = new Map();

    constructor() {
        this.register(EHR_CONSTANTS.EPIC, epicProvider);
        // this.register(EHR_CONSTANTS.ATHENA, athenaProvider);
    }

    register(name: string, provider: EhrProvider) {
        this.providers.set(name, provider);
    }

    get(providerName: string): EhrProvider {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`EHR Provider '${providerName}' not supported.`);
        }
        return provider;
    }
}

export const EhrRegistry = new EhrRegistryService();
