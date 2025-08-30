// src/routes/api/auth/login/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loginWithPassword } from '$lib/server/auth';
import { checkRateLimit } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
    const ip = getClientAddress();
    
    // Rate limiting
    if (!await checkRateLimit(`login:${ip}`)) {
        return json({ error: 'Too many login attempts' }, { status: 429 });
    }

    try {
        const { email, password } = await request.json();
        
        if (!email || !password) {
            return json({ error: 'Email and password required' }, { status: 400 });
        }

        const userAgent = request.headers.get('user-agent') || undefined;
        const result = await loginWithPassword(email, password, ip, userAgent);

        // Set refresh token as secure cookie
        cookies.set('refresh_token', result.session.refreshToken, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return json({
            user: {
                id: result.user.id,
                email: result.user.email,
                role: result.user.role
            },
            accessToken: result.session.accessToken
        });
    } catch (error:any) {
        return json({ error: error.message }, { status: 401 });
    }
};