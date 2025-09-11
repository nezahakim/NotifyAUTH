// import { json } from '@sveltejs/kit';
// import type { RequestHandler } from './$types';
// import { registerUser, createSession } from '$lib/server/auth';
// import { z } from 'zod';
// import { validateRegisterInput } from '$lib/utils/validation';


// export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
//     try {
//         const body = await request.json();
//         const { email, password } = body;

//         const result = validateRegisterInput({ email, password });

//         const user = await registerUser(email, password);
        
//         // Auto-login after registration
//         const ip = getClientAddress();
//         const userAgent = request.headers.get('user-agent') || undefined;
//         const session = await createSession(user.id, ip, userAgent);

//         cookies.set('refresh_token', session.refreshToken, {
//             path: '/',
//             httpOnly: true,
//             secure: true,
//             sameSite: 'strict',
//             maxAge: 60 * 60 * 24 * 7
//         });

//         return json({
//             user: {
//                 id: user.id,
//                 email: user.email,
//                 role: user.role
//             },
//             accessToken: session.accessToken
//         });
//     } catch (error: any) {
//         if (error instanceof z.ZodError) {
//             const structured = z.treeifyError(error);
//             return json(
//               {
//                 error: "Invalid input",
//                 details: structured
//               },
//               { status: 400 }
//             );
//         }

//         console.log(error)
//         return json({ error: error.message }, { status: 400 });
//     }
// };


import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { registerUser, createSession } from '$lib/server/auth';
import { validateRegisterInput } from '$lib/utils/validation';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  try {
    const { email, password } = await request.json();
    const { isValid, errors } = validateRegisterInput({ email, password });
    
    if (!isValid) {
      return json(
        {
          error: 'Validation failed.',
          details: errors
        },
        { status: 400 }
      );
    }

    const user = await registerUser(email, password);

    // Auto-login after registration
    const ip = getClientAddress();
    const userAgent = request.headers.get('user-agent') ?? undefined;
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
    console.error(error);
    return json({ error: error?.message ?? 'Unknown error occurred' }, { status: 500 });
  }
};
