// src/lib/server/auth.ts
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, type TokenPayload } from './jwt';
import { sendMagicLink } from './email';
import crypto from 'crypto';
import { supabase } from './supabase';


export async function registerUser(email: string, password: string) {
    // Check if user exists
    const { data: existingUser } = await supabase
        .from('custom_auth.auth_users')
        .select('id')
        .eq('email', email)
        .single();

    if (existingUser) {
        throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
        .from('custom_auth.auth_users')
        .insert({
            email,
            password_hash: passwordHash,
            email_verified: false
        })
        .select()
        .single();

    if (error) throw error;

    // Log event
    await logAuthEvent(user.id, 'register');

    return user;
}

export async function loginWithPassword(email: string, password: string, ipAddress?: string, userAgent?: string) {
    // Get user
    const { data: user, error } = await supabase
        .from('custom_auth.auth_users')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

    if (error || !user) {
        throw new Error('Invalid credentials');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
        throw new Error('Invalid credentials');
    }

    // Create session
    const session = await createSession(user.id, ipAddress, userAgent);
    
    // Log event
    await logAuthEvent(user.id, 'login', { method: 'password' });

    return {
        user,
        session
    };
}

export async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
    const refreshToken = generateRefreshToken();
    const sessionId = crypto.randomUUID();

    // Get user data for token
    const { data: user } = await supabase
        .from('custom_auth.auth_users')
        .select('email, role')
        .eq('id', userId)
        .single();

    if (!user) throw new Error('User not found');

    // Create access token
    const accessToken = generateAccessToken({
        sub: userId,
        email: user.email,
        role: user.role,
        sessionId
    });

    // Store session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const { data: session, error } = await supabase
        .from('custom_auth.auth_sessions')
        .insert({
            id: sessionId,
            user_id: userId,
            refresh_token: refreshToken,
            access_token_hash: crypto.createHash('sha256').update(accessToken).digest('hex'),
            expires_at: expiresAt.toISOString(),
            ip_address: ipAddress,
            user_agent: userAgent
        })
        .select()
        .single();

    if (error) throw error;

    return {
        accessToken,
        refreshToken,
        sessionId: session.id
    };
}

export async function refreshSession(refreshToken: string) {
    // Get session
    const { data: session, error } = await supabase
        .from('custom_auth.auth_sessions')
        .select('*, auth_users!inner(email, role)')
        .eq('refresh_token', refreshToken)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !session) {
        throw new Error('Invalid refresh token');
    }

    // Generate new access token
    const accessToken = generateAccessToken({
        sub: session.user_id,
        email: session.auth_users.email,
        role: session.auth_users.role,
        sessionId: session.id
    });

    // Update session
    await supabase
        .from('custom_auth.auth_sessions')
        .update({
            access_token_hash: crypto.createHash('sha256').update(accessToken).digest('hex')
        })
        .eq('id', session.id);

    // Log event
    await logAuthEvent(session.user_id, 'token_refresh');

    return { accessToken };
}

export async function sendMagicLinkEmail(email: string, purpose: 'login' | 'reset_password' = 'login') {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes

    // Store magic link
    await supabase
        .from('custom_auth.auth_magic_links')
        .insert({
            email,
            token,
            expires_at: expiresAt.toISOString(),
            purpose
        });

    // Send email
    const link = `${process.env.PUBLIC_AUTH_DOMAIN}/verify?token=${token}&purpose=${purpose}`;
    await sendMagicLink(email, link, purpose);

    return { success: true };
}

export async function verifyMagicLink(token: string) {
    // Get and validate magic link
    const { data: magicLink, error } = await supabase
        .from('custom_auth.auth_magic_links')
        .select('*')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .single();

    if (error || !magicLink) {
        throw new Error('Invalid or expired link');
    }

    // Mark as used
    await supabase
        .from('custom_auth.auth_magic_links')
        .update({ used_at: new Date().toISOString() })
        .eq('id', magicLink.id);

    // Get or create user
    let { data: user } = await supabase
        .from('custom_auth.auth_users')
        .select('*')
        .eq('email', magicLink.email)
        .single();

    if (!user) {
        // Create user if doesn't exist (for magic link login)
        const { data: newUser } = await supabase
            .from('custom_auth.auth_users')
            .insert({
                email: magicLink.email,
                email_verified: true
            })
            .select()
            .single();
        user = newUser;
    } else {
        // Mark email as verified
        await supabase
            .from('custom_auth.auth_users')
            .update({ email_verified: true })
            .eq('id', user.id);
    }

    if (!user) throw new Error('Failed to create/get user');

    // Log event
    await logAuthEvent(user.id, 'magic_link_verify', { purpose: magicLink.purpose });

    return {
        user,
        purpose: magicLink.purpose
    };
}

export async function logout(sessionId: string) {
    await supabase
        .from('custom_auth.auth_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

    // Log event
    const { data: session } = await supabase
        .from('custom_auth.auth_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();
    
    if (session) {
        await logAuthEvent(session.user_id, 'logout');
    }
}

async function logAuthEvent(userId: string | null, eventType: string, metadata: any = {}) {
    await supabase
        .from('custom_auth.auth_events')
        .insert({
            user_id: userId,
            event_type: eventType,
            metadata
        });
}