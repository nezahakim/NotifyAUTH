import { json, type RequestHandler } from '@sveltejs/kit';
import { refreshSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
    const refreshToken = cookies.get('refresh_token');

    if (!refreshToken) {
        return json({ error: 'No refresh token' }, { status: 401 });
    }

    try {
        const { accessToken } = await refreshSession(refreshToken);
        return json({ accessToken });
    } catch (error) {
        cookies.delete('refresh_token', { path: '/' });
        return json({ error: 'Invalid refresh token' }, { status: 401 });
    }
};