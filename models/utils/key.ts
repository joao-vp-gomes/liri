// models/utils/key.ts


// Key: 16 alphanumeric characters.
const KEY_LENGTH = 16;
export function generateKey(): string {
    return crypto.randomUUID().replace(/-/g, '').slice(0, KEY_LENGTH);
}