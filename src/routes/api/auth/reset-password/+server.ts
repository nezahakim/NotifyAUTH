// src/routes/api/auth/reset-password/+server.ts
import { json, type RequestHandler } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { supabase } from '$lib/server/supabase';


export const POST: RequestHandler = async ({ request }) => {
    try {
        const { email, newPassword } = await request.json();
        
        if (!email || !newPassword) {
            return json({ error: 'Email and new password required' }, { status: 400 });
        }
        
        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);
        
        // Update user password
        const { error } = await supabase
            .from('auth_users')
            .update({ 
                password_hash: passwordHash,
                updated_at: new Date().toISOString()
            })
            .eq('email', email);
        
        if (error) {
            return json({ error: 'Failed to reset password' }, { status: 500 });
        }
        
        // Invalidate all existing sessions for this user
        const { data: user } = await supabase
            .from('auth_users')
            .select('id')
            .eq('email', email)
            .single();
        
        if (user) {
            await supabase
                .from('auth_sessions')
                .update({ is_active: false })
                .eq('user_id', user.id);
        }
        
        return json({ success: true });
    } catch (error: any) {
        return json({ error: error.message }, { status: 500 });
    }
};