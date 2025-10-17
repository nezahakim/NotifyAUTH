import { refreshSession } from "$lib/server/auth";
import { verifyAccessToken } from "$lib/server/jwt";
import { json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {
    
    const authHeader = request.headers.get('Authorization');
    const refreshToken = authHeader?.replace('Bearer ', '');
    

    if (!refreshToken) {
        return json({ authenticated: false, code:"R10" }, { status: 401 });
    }

    try {
       const { accessToken } = await refreshSession(refreshToken);
       
       const payload = verifyAccessToken(accessToken);
               return json({
                   authenticated: true, 
                   user: {
                       id: payload.sub,
                       email: payload.email,
                       role: payload.role,
                       sessionId: payload.sessionId
                   },
                   accessToken: accessToken
               }, { status: 200 });
               
    } catch (err) { 
        return json({ authenticated: false, error: 'Server error' }, { status: 500 });
    }
};