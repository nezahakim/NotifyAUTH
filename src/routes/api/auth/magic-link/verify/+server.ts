import { json, type RequestHandler } from '@sveltejs/kit';
import { verifyMagicLink, createSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
    try {
        const { token } = await request.json();
        
        if (!token) {
            return json({ error: 'Token required' }, { status: 400 });
        }

        const result = await verifyMagicLink(token);
        
        if (result.purpose === 'login') {
            // Create session for login
            const ip = getClientAddress();
            const userAgent = request.headers.get('user-agent') || undefined;
            const session = await createSession(result.user.id, ip, userAgent);

            cookies.set('refresh_token', session.refreshToken, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7
            });

            return json({
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    role: result.user.role
                },
                accessToken: session.accessToken,
                purpose: result.purpose
            });
        } else if(result.purpose === 'reset_password') {
            // For password reset, return user info without creating session
            return json({
                user: {
                    email: result.user.email
                },
                purpose: result.purpose
            });
        }else{
            return json({
                user: {
                    email: result.user.email
                },
                purpose: result.purpose
            });
            
        }
    } catch (error: any) {
        return json({ error: error.message }, { status: 400 });
    }
};