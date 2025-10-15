import bcrypt from "bcryptjs";
import { supabase } from "./supabase";
import { sendMagicLink } from "./email";
import crypto from "crypto";
import { generateAccessToken, generateRefreshToken } from "./jwt";

export async function registerUser(email: string, password: string) {
    // Check if user exists
    const { data: existingUser } = await supabase
        .from('auth_users')
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
        .from('auth_users')
        .insert({
            email,
            password_hash: passwordHash,
            email_verified: false
        })
        .select()
        .single();

    if (error) throw error;

    return user;
}

export async function loginWithPassword(email: string, password: string, ipAddress?: string, userAgent?: string) {
    // Get user
    const { data: user, error } = await supabase
        .from('auth_users')
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
    
    return {
        user,
        session
    };
}

export async function sendMagicLinkEmail(email: string, purpose: 'login' | 'reset_password' | 'code' = 'login') {
    const token = crypto.randomBytes(4).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes

    // Store magic link
    await supabase
        .from('auth_magic_links')
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
        .from('auth_magic_links')
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
        .from('auth_magic_links')
        .update({ used_at: new Date().toISOString() })
        .eq('id', magicLink.id);

    // Get or create user
    let { data: user } = await supabase
        .from('auth_users')
        .select('*')
        .eq('email', magicLink.email)
        .single();

    if (!user) {
        user = {
            email: magicLink.email,
        };
    } else {
        // Mark email as verified
        await supabase
            .from('auth_users')
            .update({ email_verified: true })
            .eq('id', user.id);
    }

    // if (!user) throw new Error('Failed to create/get user');

    return {
        user,
        purpose: magicLink.purpose
    };
}

// export async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
//     const refreshToken = generateRefreshToken();
//     const sessionId = crypto.randomUUID();

//     // Get user data for token
//     const { data: user } = await supabase
//         .from('auth_users')
//         .select('email, role')
//         .eq('id', userId)
//         .single();

//     if (!user) throw new Error('User not found');

//     // Create access token
//     const accessToken = generateAccessToken({
//         sub: userId,
//         email: user.email,
//         role: user.role,
//         sessionId
//     });

//     // Store session
//     const expiresAt = new Date();
//     expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

//     const { data: session, error } = await supabase
//         .from('auth_sessions')
//         .insert({
//             id: sessionId,
//             user_id: userId,
//             refresh_token: refreshToken,
//             access_token_hash: crypto.createHash('sha256').update(accessToken).digest('hex'),
//             expires_at: expiresAt.toISOString(),
//             ip_address: ipAddress,
//             user_agent: userAgent
//         })
//         .select()
//         .single();

//     if (error) throw error;

//     return {
//         accessToken,
//         refreshToken,
//         sessionId: session.id
//     };
// }

export async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
    const refreshToken = generateRefreshToken();
    const sessionId = crypto.randomUUID();

    // 1. Get user info
    const { data: user } = await supabase
        .from('auth_users')
        .select('email, role')
        .eq('id', userId)
        .single();

    if (!user) throw new Error('User not found');

    // 2. Enforce max 3 active sessions
    const { data: existingSessions, error: sessionFetchError } = await supabase
        .from('auth_sessions')
        .select('id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }); // oldest first

    if (sessionFetchError) throw sessionFetchError;

    if (existingSessions && existingSessions.length >= 3) {
        const sessionsToDelete = existingSessions
            .slice(0, existingSessions.length - 2); // delete all but the 2 most recent

        const idsToDelete = sessionsToDelete.map(s => s.id);

        const { error: deleteError } = await supabase
            .from('auth_sessions')
            .delete()
            .in('id', idsToDelete);

        if (deleteError) throw deleteError;
    }

    // 3. Create new access token
    const accessToken = generateAccessToken({
        sub: userId,
        email: user.email,
        role: user.role,
        sessionId
    });

    // 4. Store new session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const { data: session, error: insertError } = await supabase
        .from('auth_sessions')
        .insert({
            id: sessionId,
            user_id: userId,
            refresh_token: refreshToken,
            access_token_hash:hashToken(accessToken),
            expires_at: expiresAt.toISOString(),
            ip_address: ipAddress,
            user_agent: userAgent
        })
        .select()
        .single();

    if (insertError) throw insertError;

    return {
        accessToken,
        refreshToken,
        sessionId: session.id
    };
}

export async function refreshSession(refreshToken: string) {
    // Get session
    const { data: session, error } = await supabase
        .from('auth_sessions')
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
        .from('auth_sessions')
        .update({
            access_token_hash: hashToken(accessToken)
        })
        .eq('id', session.id);

    return { accessToken };
}

export async function logout(sessionId: string) {
    await supabase
        .from('auth_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
}


const hashToken = (token: string) => {
    return crypto.createHash('sha256').update(token).digest('hex');
}