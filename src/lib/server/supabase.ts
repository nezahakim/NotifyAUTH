import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_KEY, SUPABASE_URL } from '$env/static/private';

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);


// Helper function to get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Helper function to automatically grant app access when user accepts
export async function grantAppAccess(userEmail: any, appKey: any) {
  try {
    const { data, error } = await supabase.rpc('auto_grant_app_access', {
      p_user_email: userEmail,
      p_app_key: appKey
    })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error granting app access:', error)
    throw error
  }
}

// Helper function to check if user has app access
export async function checkAppAccess(userEmail: any, appKey: any) {
  try {
    const { data, error } = await supabase.rpc('user_has_app_access', {
      p_user_email: userEmail,
      p_app_key: appKey
    })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error checking app access:', error)
    return false
  }
}

// Helper function to create app session
export async function createAppSession(userId: any, appId: any, sessionToken: any) {
  try {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hour session
    
    const { data, error } = await supabase
      .from('user_app_sessions')
      .insert([{
        user_id: userId,
        app_id: appId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating app session:', error)
    throw error
  }
}

// Helper function to update last accessed time
export async function updateLastAccessed(sessionToken: any) {
  try {
    const { error } = await supabase
      .from('user_app_sessions')
      .update({ 
        last_accessed_at: new Date().toISOString() 
      })
      .eq('session_token', sessionToken)
      .eq('is_active', true)
    
    if (error) throw error
  } catch (error) {
    console.error('Error updating last accessed:', error)
  }
}