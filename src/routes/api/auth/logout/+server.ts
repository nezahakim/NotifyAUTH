// src/routes/api/auth/logout/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logout } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, locals }) => {
    if (!locals.user) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    await logout(locals.user.sessionId);
    cookies.delete('refresh_token', { path: '/' });

    return json({ success: true });
};