import { json, type RequestHandler } from '@sveltejs/kit';
import { refreshSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, request }) => {
    const refreshToken = cookies.get('nc_rt');

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    const tobe_used = refreshToken || token;
    
    
    if (!tobe_used){
        return json({ error: 'Unauthorized - attempt detected' }, { status: 401 });
    }

    try {
        
        const { accessToken } = await refreshSession(tobe_used);
        return json({ accessToken });

    } catch (error) {
        cookies.delete('nc_rt', { path: '/' });
        return json({ error: 'Invalid CRT01' }, { status: 401 });
    }
};