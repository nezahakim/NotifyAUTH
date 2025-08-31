// src/routes/api/admin/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/supabase';
import { z } from 'zod';

// Validation schemas
const applicationSchema = z.object({
  app_key: z.string().min(1, 'App key is required'),
  app_name: z.string().min(1, 'App name is required'),
  app_description: z.string().optional(),
  app_url: z.string().url().optional().or(z.literal('')),
  app_icon_url: z.string().url().optional().or(z.literal('')),
  is_active: z.boolean().default(true)
});

const userStatusSchema = z.object({
  is_active: z.boolean()
});

const revokeAccessSchema = z.object({
  app_id: z.string().uuid('Invalid app ID')
});

// Utility functions
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  return 'unknown';
}

async function validateAdminAccess(request: Request): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    // Extract session token from Authorization header or cookies
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.headers.get('cookie')
                    ?.split(';')
                    ?.find(c => c.trim().startsWith('sb-access-token='))
                    ?.split('=')[1];

    if (!token) {
      return { success: false, error: 'No authentication token provided' };
    }

    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return { success: false, error: 'Invalid or expired token' };
    }

    // Check if user has admin role (you might want to implement your own role system)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return { success: false, error: 'Failed to verify user permissions' };
    }

    if (!profile.is_active) {
      return { success: false, error: 'User account is inactive' };
    }

    if (profile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions. Admin access required.' };
    }

    return { success: true, userId: user.id };
  } catch (error) {
    console.error('Admin access validation error:', error);
    return { success: false, error: 'Authentication verification failed' };
  }
}

async function logAdminAction(userId: string, action: string, details: any, ipAddress: string) {
  try {
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_user_id: userId,
        action,
        details: JSON.stringify(details),
        ip_address: ipAddress,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

// Main request handler
export const GET: RequestHandler = async ({ request, url }) => {
  try {
    // Validate admin access
    const authResult = await validateAdminAccess(request);
    if (!authResult.success) {
      return json({ error: authResult.error }, { status: 401 });
    }

    const endpoint = url.pathname.split('/api/admin')[1] || '';
    const clientIP = getClientIP(request);

    switch (endpoint) {
      case '/applications': {
        const { data, error } = await supabase
          .from('sso_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch applications:', error);
          return json({ error: 'Failed to fetch applications' }, { status: 500 });
        }

        await logAdminAction(authResult.userId!, 'view_applications', { count: data?.length || 0 }, clientIP);
        return json({ applications: data || [] });
      }

      case '/users': {
        const { data, error } = await supabase
          .from('user_profile_complete')
          .select('*')
          .order('user_created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch users:', error);
          return json({ error: 'Failed to fetch users' }, { status: 500 });
        }

        await logAdminAction(authResult.userId!, 'view_users', { count: data?.length || 0 }, clientIP);
        return json({ users: data || [] });
      }

      case '/sessions': {
        const { data, error } = await supabase
          .from('user_app_sessions')
          .select(`
            *,
            auth_users(email),
            sso_applications(app_name, app_key)
          `)
          .eq('is_active', true)
          .order('last_accessed_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Failed to fetch sessions:', error);
          return json({ error: 'Failed to fetch sessions' }, { status: 500 });
        }

        await logAdminAction(authResult.userId!, 'view_sessions', { count: data?.length || 0 }, clientIP);
        return json({ sessions: data || [] });
      }

      case '/events': {
        const { data, error } = await supabase
          .from('auth_events')
          .select(`
            *,
            auth_users(email),
            sso_applications(app_name, app_key)
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Failed to fetch auth events:', error);
          return json({ error: 'Failed to fetch auth events' }, { status: 500 });
        }

        await logAdminAction(authResult.userId!, 'view_auth_events', { count: data?.length || 0 }, clientIP);
        return json({ events: data || [] });
      }

      default:
        return json({ error: 'Endpoint not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('GET request error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    // Validate admin access
    const authResult = await validateAdminAccess(request);
    if (!authResult.success) {
      return json({ error: authResult.error }, { status: 401 });
    }

    const endpoint = url.pathname.split('/api/admin')[1] || '';
    const clientIP = getClientIP(request);

    switch (endpoint) {
      case '/applications': {
        const body = await request.json();
        
        // Validate input
        const validationResult = applicationSchema.safeParse(body);
        if (!validationResult.success) {
          return json({ 
            error: 'Invalid input', 
            details: validationResult.error.issues 
          }, { status: 400 });
        }

        const appData = validationResult.data;

        // Check for duplicate app_key
        const { data: existing } = await supabase
          .from('sso_applications')
          .select('id')
          .eq('app_key', appData.app_key)
          .single();

        if (existing) {
          return json({ error: 'Application with this key already exists' }, { status: 409 });
        }

        // Create application
        const { data, error } = await supabase
          .from('sso_applications')
          .insert([{
            ...appData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) {
          console.error('Failed to create application:', error);
          return json({ error: 'Failed to create application' }, { status: 500 });
        }

        await logAdminAction(authResult.userId!, 'create_application', { 
          app_key: appData.app_key, 
          app_name: appData.app_name 
        }, clientIP);

        return json({ application: data }, { status: 201 });
      }

      // Handle user status toggle and access revocation with dynamic routing
      default: {
        const pathParts = endpoint.split('/').filter(Boolean);
        
        if (pathParts.length === 3 && pathParts[0] === 'users' && pathParts[2] === 'toggle-status') {
          const userId = pathParts[1];
          const body = await request.json();
          
          // Validate input
          const validationResult = userStatusSchema.safeParse(body);
          if (!validationResult.success) {
            return json({ 
              error: 'Invalid input', 
              details: validationResult.error.issues 
            }, { status: 400 });
          }

          // Update user status
          const { error } = await supabase
            .from('auth_users')
            .update({ 
              is_active: validationResult.data.is_active,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (error) {
            console.error('Failed to update user status:', error);
            return json({ error: 'Failed to update user status' }, { status: 500 });
          }

          await logAdminAction(authResult.userId!, 'toggle_user_status', { 
            target_user_id: userId, 
            new_status: validationResult.data.is_active 
          }, clientIP);

          return json({ success: true });
        }

        if (pathParts.length === 3 && pathParts[0] === 'users' && pathParts[2] === 'revoke-access') {
          const userId = pathParts[1];
          const body = await request.json();
          
          // Validate input
          const validationResult = revokeAccessSchema.safeParse(body);
          if (!validationResult.success) {
            return json({ 
              error: 'Invalid input', 
              details: validationResult.error.issues 
            }, { status: 400 });
          }

          // Revoke user app access
          const { error } = await supabase
            .from('user_app_access')
            .update({ 
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('app_id', validationResult.data.app_id);

          if (error) {
            console.error('Failed to revoke app access:', error);
            return json({ error: 'Failed to revoke app access' }, { status: 500 });
          }

          // Also deactivate any active sessions
          await supabase
            .from('user_app_sessions')
            .update({ 
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('app_id', validationResult.data.app_id);

          await logAdminAction(authResult.userId!, 'revoke_user_app_access', { 
            target_user_id: userId, 
            app_id: validationResult.data.app_id 
          }, clientIP);

          return json({ success: true });
        }

        return json({ error: 'Endpoint not found' }, { status: 404 });
      }
    }
  } catch (error) {
    console.error('POST request error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request, url }) => {
  try {
    // Validate admin access
    const authResult = await validateAdminAccess(request);
    if (!authResult.success) {
      return json({ error: authResult.error }, { status: 401 });
    }

    const endpoint = url.pathname.split('/api/admin')[1] || '';
    const clientIP = getClientIP(request);

    const pathParts = endpoint.split('/').filter(Boolean);
    
    if (pathParts.length === 2 && pathParts[0] === 'applications') {
      const appId = pathParts[1];
      const body = await request.json();
      
      // Validate input
      const validationResult = applicationSchema.partial().safeParse(body);
      if (!validationResult.success) {
        return json({ 
          error: 'Invalid input', 
          details: validationResult.error.issues 
        }, { status: 400 });
      }

      const updateData = {
        ...validationResult.data,
        updated_at: new Date().toISOString()
      };

      // Check if app_key is being changed and if it already exists
      if (updateData.app_key) {
        const { data: existing } = await supabase
          .from('sso_applications')
          .select('id')
          .eq('app_key', updateData.app_key)
          .neq('id', appId)
          .single();

        if (existing) {
          return json({ error: 'Application with this key already exists' }, { status: 409 });
        }
      }

      // Update application
      const { data, error } = await supabase
        .from('sso_applications')
        .update(updateData)
        .eq('id', appId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update application:', error);
        return json({ error: 'Failed to update application' }, { status: 500 });
      }

      if (!data) {
        return json({ error: 'Application not found' }, { status: 404 });
      }

      await logAdminAction(authResult.userId!, 'update_application', { 
        app_id: appId,
        changes: updateData
      }, clientIP);

      return json({ application: data });
    }

    return json({ error: 'Endpoint not found' }, { status: 404 });
  } catch (error) {
    console.error('PUT request error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  try {
    // Validate admin access
    const authResult = await validateAdminAccess(request);
    if (!authResult.success) {
      return json({ error: authResult.error }, { status: 401 });
    }

    const endpoint = url.pathname.split('/api/admin')[1] || '';
    const clientIP = getClientIP(request);

    const pathParts = endpoint.split('/').filter(Boolean);
    
    if (pathParts.length === 2 && pathParts[0] === 'applications') {
      const appId = pathParts[1];

      // First, check if the application exists and get its details for logging
      const { data: appData } = await supabase
        .from('sso_applications')
        .select('app_key, app_name')
        .eq('id', appId)
        .single();

      if (!appData) {
        return json({ error: 'Application not found' }, { status: 404 });
      }

      // Check if there are any active sessions or user access records
      const { data: activeSessions } = await supabase
        .from('user_app_sessions')
        .select('id')
        .eq('app_id', appId)
        .eq('is_active', true)
        .limit(1);

      if (activeSessions && activeSessions.length > 0) {
        return json({ 
          error: 'Cannot delete application with active sessions. Please revoke all access first.' 
        }, { status: 409 });
      }

      // Soft delete by marking as inactive instead of hard delete
      const { error: updateError } = await supabase
        .from('sso_applications')
        .update({ 
          is_active: false,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', appId);

      if (updateError) {
        console.error('Failed to delete application:', updateError);
        return json({ error: 'Failed to delete application' }, { status: 500 });
      }

      // If you want hard delete instead, uncomment this and comment the soft delete above:
      /*
      const { error: deleteError } = await supabase
        .from('sso_applications')
        .delete()
        .eq('id', appId);

      if (deleteError) {
        console.error('Failed to delete application:', deleteError);
        return json({ error: 'Failed to delete application' }, { status: 500 });
      }
      */

      await logAdminAction(authResult.userId!, 'delete_application', { 
        app_id: appId,
        app_key: appData.app_key,
        app_name: appData.app_name
      }, clientIP);

      return json({ success: true });
    }

    return json({ error: 'Endpoint not found' }, { status: 404 });
  } catch (error) {
    console.error('DELETE request error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};