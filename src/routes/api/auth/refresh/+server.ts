import { json, type RequestHandler } from '@sveltejs/kit';
import { refreshSession } from '$lib/server/auth';
import { supabase } from '$lib/server/supabase';

export const POST: RequestHandler = async ({ cookies }) => {
    // const refreshToken = cookies.get('refresh_token');

    const auth_token =  cookies.get('auth_token');
    const auth_token_1 = cookies.get('auth_token_1');

    if(!auth_token || !auth_token_1) {
        return json({ error: 'Unauthorized - attempt  CODE-C' }, { status: 401 });
    }

    const { data: refreshData, error} = await supabase
        .from('auth_sessions')
        .select('refresh_token')
        .eq('id', auth_token)
        .eq('user_id', auth_token_1)
        .single();

    const refreshToken = refreshData?.refresh_token;

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