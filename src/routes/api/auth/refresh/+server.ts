// import { json, type RequestHandler } from '@sveltejs/kit';
// import { refreshSession } from '$lib/server/auth';

// export const POST: RequestHandler = async ({ cookies }) => {
//     const refreshToken = cookies.get('refresh_token');

//     if (!refreshToken) {
//         return json({ error: 'No refresh token' }, { status: 401 });
//     }

//     try {
//         const { accessToken } = await refreshSession(refreshToken);
//         return json({ accessToken });
//     } catch (error) {
//         cookies.delete('refresh_token', { path: '/' });
//         return json({ error: 'Invalid refresh token' }, { status: 401 });
//     }
// };


import { json, type RequestHandler } from '@sveltejs/kit';
import { refreshSession } from '$lib/server/auth';
import { supabase } from '$lib/server/supabase';

export const POST: RequestHandler = async ({ cookies }) => {
    const sessionId = cookies.get('auth_token');
    const userId = cookies.get('auth_token_1');

    if (!sessionId && !userId) {
        return json({ error: 'Unauthorized - attempt detected' }, { status: 401 });
    }

    const { data: refreshData, error} = await supabase.from('auth_sessions')
    .select('refresh_token')
    .eq('id', sessionId)
    .eq('user_id', userId).single();

    if (error || !refreshData) {
        return json({ error: 'Unauthorized - attempt C2' }, { status: 401 });
    }

    const refreshToken = refreshData.refresh_token;

    if (!refreshToken) {
        return json({ error: 'Unauthorized - attempt C1' }, { status: 401 });
    }

    try {
        const { accessToken } = await refreshSession(refreshToken);
        return json({ accessToken });
    } catch (error) {
        cookies.delete('refresh_token', { path: '/' });
        return json({ error: 'Invalid refresh token' }, { status: 401 });
    }
};