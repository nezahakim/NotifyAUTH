import { json, type RequestHandler } from '@sveltejs/kit';
import { refreshSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
    const refreshToken = cookies.get('nc_rt');
    
    if (!refreshToken) { 
        return json({ error: 'Unauthorized - attempt detected' }, { status: 401 });
    }

    try {
        
        const { accessToken } = await refreshSession(refreshToken);
        return json({ accessToken });

    } catch (error) {
        cookies.delete('nc_rt', { path: '/' });
        return json({ error: 'Invalid CRT01' }, { status: 401 });
    }
};