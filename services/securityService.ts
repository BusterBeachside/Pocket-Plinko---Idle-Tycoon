/**
 * Security Service for Pocket Plinko
 * Provides encryption, decryption, and checksum verification
 * for Websim Cloud Saves and Leaderboard submissions to prevent database tampering.
 */

const WEBSIM_SALT_1 = 'PP_v3.2_Websim_Sec_Salt_#98412738';
const WEBSIM_SALT_2 = 'Plinko_Leaderboard_Guard_@2026_x77';

function utf8ToAscii(str: string): string {
    try {
        return unescape(encodeURIComponent(str));
    } catch (e) {
        return str;
    }
}

function asciiToUtf8(str: string): string {
    try {
        return decodeURIComponent(escape(str));
    } catch (e) {
        return str;
    }
}

// Compact SHA-256 implementation for fast synchronous checksums
function sha256(ascii: string): string {
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';

    const words: number[] = [];
    const asciiLength = ascii[lengthProperty] * 8;

    let hash = (sha256 as any).h = (sha256 as any).h || [];
    let k = (sha256 as any).k = (sha256 as any).k || [];
    let primeCounter = k[lengthProperty];

    const isPrime = (n: number) => {
        for (let factor = 2; factor * factor <= n; factor++) {
            if (n % factor === 0) return false;
        }
        return true;
    };

    let candidate = 2;
    while (primeCounter < 64) {
        if (isPrime(candidate)) {
            if (primeCounter < 8) {
                hash[primeCounter] = (mathPow(candidate, 1/2) * maxWord) | 0;
            }
            k[primeCounter] = (mathPow(candidate, 1/3) * maxWord) | 0;
            primeCounter++;
        }
        candidate++;
    }

    hash = hash.slice(0);

    for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        words[i >> 2] |= j << ((3 - i % 4) * 8);
    }
    words[ascii[lengthProperty] >> 2] |= 0x80 << ((3 - ascii[lengthProperty] % 4) * 8);
    words[(((ascii[lengthProperty] + 8) >> 6) << 4) + 15] = asciiLength;

    for (j = 0; j < words[lengthProperty]; j += 16) {
        const w = words.slice(j, j + 16);
        const oldHash = hash.slice(0);

        for (i = 0; i < 64; i++) {
            const w15 = w[i - 15], w2 = w[i - 2];
            const s0 = (w15 >>> 7 | w15 << 25) ^ (w15 >>> 18 | w15 << 14) ^ (w15 >>> 3);
            const s1 = (w2 >>> 17 | w2 << 15) ^ (w2 >>> 19 | w2 << 13) ^ (w2 >>> 10);

            w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;

            const a = hash[0], e = hash[4];
            const temp1 = hash[7]
                + ((e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7))
                + ((e & hash[5]) ^ (~e & hash[6]))
                + k[i]
                + w[i];
            const temp2 = ((a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
            hash.pop();
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    for (i = 0; i < 8; i++) {
        for (j = 3; j >= 0; j--) {
            const b = (hash[i] >> (j * 8)) & 255;
            result += (b < 16 ? '0' : '') + b.toString(16);
        }
    }
    return result;
}

export class SecurityService {
    /**
     * Encrypts/obfuscates a JS object or string using a key derived from userId
     */
    static encryptData(data: any, userId: string): string {
        try {
            const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
            const keyStr = sha256(utf8ToAscii(`${userId}:${WEBSIM_SALT_1}`));
            let xorResult = '';
            for (let i = 0; i < jsonStr.length; i++) {
                const charCode = jsonStr.charCodeAt(i);
                const keyChar = keyStr.charCodeAt(i % keyStr.length);
                xorResult += String.fromCharCode(charCode ^ keyChar);
            }
            const base64 = btoa(utf8ToAscii(xorResult));
            return `enc_v2_${base64}`;
        } catch (e) {
            console.error('[SecurityService] Encrypt failed:', e);
            return typeof data === 'string' ? data : JSON.stringify(data);
        }
    }

    /**
     * Decrypts an encrypted payload string
     */
    static decryptData(encryptedStr: string, userId: string): any {
        if (!encryptedStr || typeof encryptedStr !== 'string') return null;
        if (!encryptedStr.startsWith('enc_v2_')) {
            // Not encrypted (legacy plain text / JSON)
            try {
                return JSON.parse(encryptedStr);
            } catch (e) {
                return encryptedStr;
            }
        }

        try {
            const base64 = encryptedStr.replace('enc_v2_', '');
            const xorResult = asciiToUtf8(atob(base64));
            const keyStr = sha256(utf8ToAscii(`${userId}:${WEBSIM_SALT_1}`));
            let jsonStr = '';
            for (let i = 0; i < xorResult.length; i++) {
                const charCode = xorResult.charCodeAt(i);
                const keyChar = keyStr.charCodeAt(i % keyStr.length);
                jsonStr += String.fromCharCode(charCode ^ keyChar);
            }
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('[SecurityService] Decrypt failed:', e);
            return null;
        }
    }

    /**
     * Computes a cryptographic checksum for a leaderboard score
     */
    static computeScoreChecksum(userId: string, leaderboardId: string, score: number, metadata?: any): string {
        const numScore = Math.floor(score);
        const masterMult = Math.max(1, Number(metadata?.masterMultiplier) || 1);
        const prestiged = Math.max(0, Number(metadata?.timesPrestiged) || 0);
        const payloadToHash = `${userId}:${leaderboardId}:${numScore}:${masterMult}:${prestiged}:${WEBSIM_SALT_2}`;
        return sha256(utf8ToAscii(payloadToHash));
    }

    /**
     * Validates a leaderboard entry's score checksum.
     * Returns { valid: boolean, isLegacy: boolean }.
     * - Returns valid: true, isLegacy: true for older saves without signature (for backwards compatibility).
     * - Returns valid: false if a signature is present BUT does not match score (tamper detected).
     */
    static verifyScoreChecksum(entry: any, leaderboardId: string = 'mps'): { valid: boolean; isLegacy: boolean } {
        if (!entry) return { valid: false, isLegacy: false };

        const userId = entry.user_id || entry.userId || entry.id?.split('-')[0] || '';
        const score = Math.floor(Number(entry.score) || 0);
        const meta = entry.metadata || {};

        const sig = entry._sig || meta._sig || entry.checksum;

        if (!sig) {
            // Legacy entry created before checksum protection
            // Allow for backwards compatibility
            return { valid: true, isLegacy: true };
        }

        const expectedSig = SecurityService.computeScoreChecksum(userId, leaderboardId, score, meta);
        if (sig === expectedSig) {
            return { valid: true, isLegacy: false };
        }

        console.warn(`[SecurityService] Tamper detected on leaderboard score for user ${userId}!`);
        return { valid: false, isLegacy: false };
    }

    /**
     * Computes checksum for full save state (currency + stats)
     */
    static computeSaveChecksum(userId: string, currency: number, stats: any): string {
        const numCurr = Math.floor(currency);
        const lifetime = Math.floor(Number(stats?.allTimeEarnings || stats?.lifetimeEarnings) || 0);
        const prestiged = Number(stats?.timesPrestiged) || 0;
        const masterMult = Number(stats?.masterMultiplier) || 1;
        const payloadToHash = `${userId}:${numCurr}:${lifetime}:${prestiged}:${masterMult}:${WEBSIM_SALT_1}`;
        return sha256(utf8ToAscii(payloadToHash));
    }

    /**
     * Verifies save state checksum
     */
    static verifySaveChecksum(userId: string, currency: number, stats: any, checksum?: string): { valid: boolean; isLegacy: boolean } {
        if (!checksum) {
            // Legacy save without checksum
            return { valid: true, isLegacy: true };
        }

        const expectedSig = SecurityService.computeSaveChecksum(userId, currency, stats);
        if (checksum === expectedSig) {
            return { valid: true, isLegacy: false };
        }

        console.warn(`[SecurityService] Tamper detected on cloud save for user ${userId}!`);
        return { valid: false, isLegacy: false };
    }
}
