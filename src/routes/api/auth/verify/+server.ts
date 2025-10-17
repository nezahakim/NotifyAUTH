import { json, type RequestHandler } from '@sveltejs/kit';
import { verifyAccessToken } from '$lib/server/jwt';
import { decodeHashedToken } from '@notifycode/hash-it';
import { HASH_IT_KEY, MOBILE_REQUEST_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
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

    
    if (!tokenTobeUsed) {
        console.log("No token")
        return json({ valid: false, error: 'UNATHORIZED ACTION AUTH_ERROR_NT' }, { status: 401 });
    }
    
    try {

        const payload = verifyAccessToken(tokenTobeUsed);
        return json({
            valid: true, 
            user: {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
                sessionId: payload.sessionId
            }
        }, { status: 200 });
        
    } catch (error: any) {
        console.log(error)
        return json({ valid: false, error: 'Invalid token AUTH_ERROR_V-ISE' }, { status: 401 });
    }
};