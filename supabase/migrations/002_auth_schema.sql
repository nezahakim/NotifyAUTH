-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (your existing auth table)
CREATE TABLE auth_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE
);

-- User profiles table (extended user information)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE,
    full_name VARCHAR(200),
    avatar_url TEXT,
    phone VARCHAR(20),
    date_of_birth DATE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en',
    bio TEXT,
    website_url TEXT,
    company VARCHAR(200),
    job_title VARCHAR(200),
    location VARCHAR(200),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications/Services table (all available apps in your SSO ecosystem)
CREATE TABLE sso_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'gmail', 'collab', 'youtube', 'analytics'
    app_name VARCHAR(200) NOT NULL,
    app_description TEXT,
    app_url TEXT,
    app_icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    app_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User application access table (automatically granted when user accepts)
CREATE TABLE user_app_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES sso_applications(id) ON DELETE CASCADE,
    first_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL for no expiration
    is_active BOOLEAN DEFAULT TRUE,
    access_level VARCHAR(50) DEFAULT 'user', -- 'user', 'admin', 'readonly', etc.
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, app_id)
);

-- User app sessions table (track active sessions per app)
CREATE TABLE user_app_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES sso_applications(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    access_token_hash VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'
);

-- Sessions table (your existing main auth sessions)
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    access_token_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Magic links table (your existing table)
CREATE TABLE auth_magic_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    purpose VARCHAR(50) DEFAULT 'login' -- 'login' or 'reset_password'
);

-- Auth events table (enhanced for SSO tracking)
CREATE TABLE auth_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
    app_id UUID REFERENCES sso_applications(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'refresh', 'register', 'app_access', etc.
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application permissions table (fine-grained permissions within apps)
CREATE TABLE app_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL REFERENCES sso_applications(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    permission_name VARCHAR(200) NOT NULL,
    permission_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(app_id, permission_key)
);

-- User app permissions table (specific permissions per user per app)
CREATE TABLE user_app_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES sso_applications(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES app_permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES auth_users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, app_id, permission_id)
);

-- Indexes for performance
CREATE INDEX idx_auth_users_email ON auth_users(email);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_sso_applications_app_key ON sso_applications(app_key);
CREATE INDEX idx_user_app_access_user_id ON user_app_access(user_id);
CREATE INDEX idx_user_app_access_app_id ON user_app_access(app_id);
CREATE INDEX idx_user_app_access_active ON user_app_access(user_id, app_id, is_active);
CREATE INDEX idx_user_app_sessions_user_id ON user_app_sessions(user_id);
CREATE INDEX idx_user_app_sessions_app_id ON user_app_sessions(app_id);
CREATE INDEX idx_user_app_sessions_token ON user_app_sessions(session_token);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_refresh_token ON auth_sessions(refresh_token);
CREATE INDEX idx_auth_magic_links_token ON auth_magic_links(token);
CREATE INDEX idx_auth_events_user_id ON auth_events(user_id);
CREATE INDEX idx_auth_events_app_id ON auth_events(app_id);
CREATE INDEX idx_auth_events_created_at ON auth_events(created_at DESC);
CREATE INDEX idx_user_app_permissions_user_app ON user_app_permissions(user_id, app_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_auth_users_updated_at BEFORE UPDATE ON auth_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auth_sessions_updated_at BEFORE UPDATE ON auth_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sso_applications_updated_at BEFORE UPDATE ON sso_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW user_profile_complete AS
SELECT 
    u.id,
    u.email,
    u.role,
    u.is_active,
    u.created_at as user_created_at,
    p.username,
    p.full_name,
    p.avatar_url,
    p.phone,
    p.company,
    p.job_title,
    p.location,
    p.preferences
FROM auth_users u
LEFT JOIN user_profiles p ON u.id = p.user_id;

CREATE VIEW user_app_access_details AS
SELECT 
    uaa.user_id,
    uaa.app_id,
    u.email,
    u.role as user_role,
    p.username,
    p.full_name,
    a.app_key,
    a.app_name,
    uaa.access_level,
    uaa.first_accessed_at,
    uaa.last_accessed_at,
    uaa.expires_at,
    uaa.is_active,
    CASE 
        WHEN uaa.expires_at IS NULL OR uaa.expires_at > NOW() 
        THEN TRUE 
        ELSE FALSE 
    END as access_valid
FROM user_app_access uaa
JOIN auth_users u ON uaa.user_id = u.id
JOIN sso_applications a ON uaa.app_id = a.id
LEFT JOIN user_profiles p ON u.id = p.user_id;

-- Sample data
INSERT INTO sso_applications (app_key, app_name, app_description, app_url) VALUES
('tune', 'NotifyTune+', 'Social Media Network', 'https://tune.notifycode.org'),
('fashion', 'NotifyFashion+', 'Notifycode Fashion Brand', 'https://fashion.notifycode.org'),
('delivery', 'NotifyDelivery+', 'Delivery Service', 'https://delivery.notifycode.org'),
('tv', 'NotifyTV+', 'Television Platform', 'https://tv.notifycode.org'),
('cast', 'Notifycast+', 'News platform', 'https://cast.notifycode.org'),
('nezaai', 'NezaAI', 'Notifycode AI Research', 'https://ai.notifycode.org');

-- Function to automatically grant app access when user accepts
CREATE OR REPLACE FUNCTION auto_grant_app_access(
    p_user_email VARCHAR,
    p_app_key VARCHAR,
    p_access_level VARCHAR DEFAULT 'user'
)
RETURNS BOOLEAN AS $
DECLARE
    v_user_id UUID;
    v_app_id UUID;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM auth_users WHERE email = p_user_email;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', p_user_email;
    END IF;

    -- Get app ID
    SELECT id INTO v_app_id FROM sso_applications WHERE app_key = p_app_key AND is_active = TRUE;
    IF v_app_id IS NULL THEN
        RAISE EXCEPTION 'Active application with key % not found', p_app_key;
    END IF;

    -- Insert or update access (automatically granted when user accepts)
    INSERT INTO user_app_access (user_id, app_id, access_level)
    VALUES (v_user_id, v_app_id, p_access_level)
    ON CONFLICT (user_id, app_id) 
    DO UPDATE SET 
        access_level = EXCLUDED.access_level,
        last_accessed_at = NOW(),
        is_active = TRUE;

    -- Log the access event
    INSERT INTO auth_events (user_id, app_id, event_type, metadata)
    VALUES (v_user_id, v_app_id, 'app_access_granted', '{"auto_granted": true}'::jsonb);

    RETURN TRUE;
END;
$ LANGUAGE plpgsql;

-- Function to check if user has access to app
CREATE OR REPLACE FUNCTION user_has_app_access(
    p_user_email VARCHAR,
    p_app_key VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM user_app_access_details 
        WHERE email = p_user_email 
        AND app_key = p_app_key 
        AND is_active = TRUE 
        AND access_valid = TRUE
    ) INTO v_has_access;
    
    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql;