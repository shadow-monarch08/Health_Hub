
const crypto = require('crypto');

// Mock Env
process.env.TOKEN_ENCRYPTION_KEY = 'test-secret-key-value-123';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

class CryptoService {
    constructor() {
        const keyString = process.env.TOKEN_ENCRYPTION_KEY;
        this.key = crypto.createHash('sha256').update(keyString).digest();
    }

    encrypt(text) {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    decrypt(encryptedText) {
        const parts = encryptedText.split(':');
        console.log('Decryption parts:', parts);
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

const service = new CryptoService();
const original = "Bearer 123456789";
console.log("Original:", original);

try {
    const encrypted = service.encrypt(original);
    console.log("Encrypted:", encrypted);

    const decrypted = service.decrypt(encrypted);
    console.log("Decrypted:", decrypted);

    if (original === decrypted) {
        console.log("SUCCESS: Decryption matches original");
    } else {
        console.log("FAILURE: Mismatch");
    }
} catch (e) {
    console.error("ERROR:", e);
}
