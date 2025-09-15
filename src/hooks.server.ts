import type { Handle } from '@sveltejs/kit';
import { verifyAccessToken } from '$lib/server/jwt';
import { sequence } from '@sveltejs/kit/hooks';

const securityHeaders: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);
    
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' " + (process.env.PUBLIC_APP_DOMAINS || '').split(',').join(' ') + "; " +
        "font-src 'self'; " +
        "frame-ancestors 'none';"
    );
    
    return response;
};


const authHandle: Handle = async ({ event, resolve }) => {
    const authHeader = event.request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
        try {
            const payload = verifyAccessToken(token);
            event.locals.user = {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
                sessionId: payload.sessionId
            };
        } catch (err) {
            event.locals.user = null;
        }
    } else {
        event.locals.user = null;
    }

    const isProtected = ['/dashboard', '/profile', '/settings', '/admin'].some(route =>
        event.url.pathname.startsWith(route)
    );

    // 🚫 Redirect unauthenticated users trying to access protected routes
    if (isProtected && !event.locals.user) {
        return new Response(null, {
            status: 302,
            headers: {
                Location: '/login?redirect=' + encodeURIComponent(event.url.pathname)
            }
        });
    }

    const publicOnlyRoutes = ['/login', '/register'];

if (event.locals.user && publicOnlyRoutes.includes(event.url.pathname)) {
    return new Response(null, {
        status: 302,
        headers: {
            Location: '/dashboard'
        }
    });
}


    return resolve(event);
};

const corsHandle: Handle = async ({ event, resolve }) => {
    // Handle preflight requests
    if (event.request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400',
            }
        });
    }
    
    const response = await resolve(event);
    
    // Add CORS headers for API endpoints
    if (event.url.pathname.startsWith('/api/')) {
        const allowedOrigins = process.env.PUBLIC_APP_DOMAINS?.split(',') || [];
        const origin = event.request.headers.get('origin');
        
        if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development')) {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Credentials', 'true');
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        }
    }
    
    return response;
};

export const handle = sequence(securityHeaders, corsHandle, authHandle);