import crypto from 'crypto';
import { env } from '../../config/environment';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class CryptoService {
    private key: Buffer;

    constructor() {
        const keyString = process.env.TOKEN_ENCRYPTION_KEY;
        if (!keyString) {
            throw new Error('TOKEN_ENCRYPTION_KEY is not defined in environment variables');
        }
        // Ensure key is 32 bytes (hexdigest or raw string? Let's assume hex if 64 chars, else hash it?)
        // Instructions said "Master key (TOKEN_ENCRYPTION_KEY)".
        // We expect a 32-byte hex string (64 chars) or we should hash whatever is provided to get 32 bytes.
        // For safety, let's hash it to ensure 32 bytes always.
        this.key = crypto.createHash('sha256').update(keyString).digest();
    }

    encrypt(text: string): string {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Format: iv:authTag:encryptedContent
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    decrypt(encryptedText: string): string {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted text format');
        }

        const [ivHex, authTagHex, encryptedContentHex] = parts;

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);

        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedContentHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}

export const cryptoService = new CryptoService();
