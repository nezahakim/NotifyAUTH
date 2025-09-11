import { json, type RequestHandler } from '@sveltejs/kit';
import { refreshSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, request }) => {
    const token_cookie = cookies.get('refresh_token');
    const auth = request.headers.get('authorization');

    const refreshToken = auth?.slice(7);


    if (!refreshToken) {
        return json({ error: 'Unauthorized - attempt detected' }, { status: 401 });
    }

    try {
        const { accessToken } = await refreshSession(refreshToken);
        return json({ accessToken });
    } catch (error) {
        cookies.delete('refresh_token', { path: '/' });
        return json({ error: 'Invalid refresh token' }, { status: 401 });
    }
};