import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { registerUser, createSession } from '$lib/server/auth';
import { z } from 'zod';

const registerSchema = z.object({
    email: z.email({ message: 'Invalid email address' }),
    password: z.string()
      .min(8, { message: 'Password must be at least 8 characters long' })
      .refine((val) => /[a-z]/.test(val), {
        message: 'Password must contain at least one lowercase letter'
      })
      .refine((val) => /[A-Z]/.test(val), {
        message: 'Password must contain at least one uppercase letter'
      })
      .refine((val) => /\d/.test(val), {
        message: 'Password must contain at least one number'
      })
});

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
    try {
        const body = await request.json();
        const { email, password } = registerSchema.parse(body);

        const user = await registerUser(email, password);
        
        // Auto-login after registration
        const ip = getClientAddress();
        const userAgent = request.headers.get('user-agent') || undefined;
        const session = await createSession(user.id, ip, userAgent);

        cookies.set('refresh_token', session.refreshToken, {
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7
        });

        return json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            accessToken: session.accessToken
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            const structured = z.treeifyError(error);
            return json(
              {
                error: "Invalid input",
                details: structured
              },
              { status: 400 }
            );
        }

        console.log(error)
        return json({ error: error.message }, { status: 400 });
    }
};