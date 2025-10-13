import { json, type RequestHandler } from '@sveltejs/kit';
import { verifyAccessToken } from '$lib/server/jwt';

export const GET: RequestHandler = async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
        console.log("No token")
        return json({ valid: false, error: 'No token provided' }, { status: 401 });
    }
    
    try {

        const payload = verifyAccessToken(token);
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
        return json({ valid: false, error: 'Invalid token' }, { status: 401 });
    }
};