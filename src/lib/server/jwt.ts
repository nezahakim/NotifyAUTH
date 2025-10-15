import jwt from 'jsonwebtoken';

import {
    JWT_SECRET,
    JWT_ACCESS_TOKEN_EXPIRY,
    JWT_REFRESH_TOKEN_EXPIRY,
} from '$env/static/private';

import {
    PUBLIC_APP_DOMAINS,
    PUBLIC_AUTH_DOMAIN
} from '$env/static/public'

const ACCESS_TOKEN_EXPIRY = JWT_ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = JWT_REFRESH_TOKEN_EXPIRY || '7d';

export interface TokenPayload {
    sub: string; // user id
    email: string;
    role: string;
    sessionId: string;
}

export function generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        issuer: PUBLIC_AUTH_DOMAIN,
        audience: PUBLIC_APP_DOMAINS?.split(',')
    });
}

export function generateRefreshToken(): string {
    const array = new Uint8Array(32); // 32 bytes = 256 bits
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}


export function verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET, {
        issuer: PUBLIC_AUTH_DOMAIN,
        audience: PUBLIC_APP_DOMAINS?.split(',')
    }) as TokenPayload;
}

export function decodeToken(token: string): TokenPayload | null {
    try {
        return jwt.decode(token) as TokenPayload;
    } catch {
        return null;
    }
}

