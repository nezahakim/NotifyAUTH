// src/routes/api/auth/magic-link/send/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendMagicLinkEmail } from '$lib/server/auth';
import { checkRateLimit } from '$lib/server/rate-limit';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
    const ip = getClientAddress();
    
    if (!await checkRateLimit(`magic-link:${ip}`)) {
        return json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        const { email, purpose = 'login' } = await request.json();
        
        if (!email) {
            return json({ error: 'Email required' }, { status: 400 });
        }

        await sendMagicLinkEmail(email, purpose);
        return json({ success: true, message: 'Magic link sent to your email' });
    } catch (error: any) {
        return json({ error: error.message }, { status: 500 });
    }
};