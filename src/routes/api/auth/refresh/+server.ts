import { json, type RequestHandler } from '@sveltejs/kit';
import { refreshSession } from '$lib/server/auth';
import { decodeHashedToken, hashToken } from '@notifycode/hash-it';
import { HASH_IT_KEY, MOBILE_REQUEST_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ cookies, request }) => {
    const refreshToken = cookies.get('nc_rt');
    let decodedRefToken;
    let tokenTobeUsed;

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const body = await request.json();

    if(body && token){
        const { mobile_request, key } = body;

        if (mobile_request && key == MOBILE_REQUEST_KEY){
            tokenTobeUsed = decodeHashedToken({
                token: token,
                key: HASH_IT_KEY
            })
        }else{
            tokenTobeUsed = token;
        }
    }

    if(refreshToken){
        decodedRefToken = decodeHashedToken({
            token: refreshToken,
            key: HASH_IT_KEY
        })
    }

    const tobe_used = decodedRefToken || tokenTobeUsed;
    
    
    if (!tobe_used){
        return json({ error: 'Unauthorized - attempt detected AUTH_ERROR_TBT' }, { status: 401 });
    }

    try {
        
        const { accessToken } = await refreshSession(tobe_used);
        const hashedAccToken = hashToken({ 
            token: accessToken,
            key: HASH_IT_KEY
        });
        
        return json({ accessToken: hashedAccToken });

    } catch (error) {
        cookies.delete('nc_rt', { path: '/' });

        console.error('Error refreshing session:', error);
        return json({ error: 'Invalid CRT01' }, { status: 401 });
    }
};