// src/routes/health/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

export const GET: RequestHandler = async () => {
    try {
        // Check database connection
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );
        
        const { error } = await supabase
            .from('auth_users')
            .select('count')
            .limit(1)
            .single();
        
        if (error) throw error;
        
        return json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'auth-server',
            version: '1.0.0'
        });
    } catch (error: any) {
        return json({
            status: 'unhealthy',
            error: error.message
        }, { status: 503 });
    }
};