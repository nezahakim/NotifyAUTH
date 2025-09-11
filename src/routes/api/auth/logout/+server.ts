import { json, type RequestHandler } from '@sveltejs/kit';
import { logout } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, locals }) => {
    if (!locals.user) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    await logout(locals.user.sessionId);
    cookies.delete('refresh_token', { path: '/' });

    return json({ success: true });
};