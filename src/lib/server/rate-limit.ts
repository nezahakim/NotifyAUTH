// src/lib/server/rate-limit.ts
import { RATE_LIMIT_MAX_REQUESTS } from '$env/static/private';

interface RateLimitEntry {
    key: string;
    count: number;
    window_start: Date;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = parseInt(RATE_LIMIT_MAX_REQUESTS || '5');

export async function checkRateLimit(key: string): Promise<boolean> {
    const now = new Date();
    const entry = rateLimitMap.get(key);

    if (!entry) {
        rateLimitMap.set(key, {
            key,
            count: 1,
            window_start: now
        });
        return true;
    }

    const windowElapsed = now.getTime() - entry.window_start.getTime();

    if (windowElapsed > WINDOW_MS) {
        // Reset window
        entry.count = 1;
        entry.window_start = now;
        return true;
    }

    if (entry.count >= MAX_REQUESTS) {
        return false;
    }

    entry.count++;
    return true;
}