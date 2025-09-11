import { json, type RequestHandler } from '@sveltejs/kit';
import { sendMagicLinkEmail } from '$lib/server/auth';
import { checkRateLimit } from '$lib/server/rate-limit';
import { supabase } from '$lib/server/supabase';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
    const ip = getClientAddress();
    
    if (!await checkRateLimit(`magic-link:${ip}`)) {
        return json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        const { email, purpose } = await request.json();
        
        if (!email && !purpose) {
            return json({ error: 'Info required' }, { status: 400 });
        }

        if (purpose === 'code') {
           // Check if user exists
               const { data: existingUser } = await supabase
                   .from('auth_users')
                   .select('id')
                   .eq('email', email)
                   .single();
           
               if (existingUser) {
                   return json({ success: false, message: 'User already exists' }, { status: 400 });
               }
        }

        if (purpose === 'reset_password') {
            // Check if user exists
                const { data: existingUser } = await supabase
                    .from('auth_users')
                    .select('id')
                    .eq('email', email)
                    .single();
            
                if (!existingUser) {
                    return json({ success: false, message: "User doesn't exist." }, { status: 400 });
                }
         }

        await sendMagicLinkEmail(email, purpose);
        return json({ success: true, message: 'Magic link sent to your email' });

    } catch (error: any) {
        return json({ error: error.message }, { status: 500 });
    }
};