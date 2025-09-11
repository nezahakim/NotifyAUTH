CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE TABLE auth_magic_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    purpose VARCHAR(50) DEFAULT 'login' -- 'login' or 'reset_password'
);



-- ========== INDEXES FOR PERFORMANCE ==========
CREATE INDEX idx_auth_users_email_verified ON auth_users (email_verified);
CREATE INDEX idx_auth_users_is_active ON auth_users (is_active);
CREATE INDEX idx_auth_users_created_at ON auth_users (created_at);
CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX idx_user_profiles_username ON user_profiles (username);
CREATE INDEX idx_user_profiles_preferences ON user_profiles USING GIN (preferences);
CREATE INDEX idx_user_profiles_locale ON user_profiles (locale);
CREATE INDEX idx_user_profiles_timezone ON user_profiles (timezone);
CREATE INDEX idx_sso_applications_is_active ON sso_applications (is_active);
CREATE INDEX idx_sso_applications_requires_approval ON sso_applications (requires_approval);
CREATE INDEX idx_sso_applications_metadata ON sso_applications USING GIN (app_metadata);
CREATE INDEX idx_user_app_access_user_id ON user_app_access (user_id);
CREATE INDEX idx_user_app_access_app_id ON user_app_access (app_id);
CREATE INDEX idx_user_app_access_is_active ON user_app_access (is_active);
CREATE INDEX idx_user_app_access_expires_at ON user_app_access (expires_at);
CREATE INDEX idx_user_app_access_metadata ON user_app_access USING GIN (metadata);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions (user_id);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions (expires_at);
CREATE INDEX idx_auth_sessions_is_active ON auth_sessions (is_active);
CREATE INDEX idx_auth_sessions_created_at ON auth_sessions (created_at);
CREATE INDEX idx_auth_sessions_access_token_hash ON auth_sessions (access_token_hash);
CREATE INDEX idx_auth_magic_links_email ON auth_magic_links (email);
CREATE INDEX idx_auth_magic_links_expires_at ON auth_magic_links (expires_at);
CREATE INDEX idx_auth_magic_links_used_at ON auth_magic_links (used_at);
CREATE INDEX idx_auth_magic_links_purpose ON auth_magic_links (purpose);


-- Function to auto-update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for tables with updated_at field
CREATE TRIGGER trg_update_auth_users_updated_at
BEFORE UPDATE ON auth_users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_auth_sessions_updated_at
BEFORE UPDATE ON auth_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_sso_applications_updated_at
BEFORE UPDATE ON sso_applications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_user_app_access_updated_at
BEFORE UPDATE ON user_app_access
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();




CREATE OR REPLACE VIEW user_profile_complete AS
SELECT 
  u.id AS user_id,
  u.email,
  u.role,
  u.is_active,
  u.email_verified,
  u.created_at AS registered_at,
  p.username,
  p.full_name,
  p.avatar_url,
  p.phone,
  p.company,
  p.job_title,
  p.location,
  p.preferences,
  p.timezone,
  p.locale
FROM auth_users u
LEFT JOIN user_profiles p ON p.user_id = u.id;


CREATE OR REPLACE VIEW user_app_access_details AS
SELECT 
  uaa.user_id,
  uaa.app_id,
  u.email,
  u.role AS user_role,
  p.username,
  p.full_name,
  a.app_key,
  a.app_name,
  a.app_url,
  uaa.access_level,
  uaa.first_accessed_at,
  uaa.last_accessed_at,
  uaa.expires_at,
  uaa.is_active,
  COALESCE(uaa.expires_at IS NULL OR uaa.expires_at > NOW(), FALSE) AS access_valid
FROM user_app_access uaa
JOIN auth_users u ON u.id = uaa.user_id
LEFT JOIN user_profiles p ON p.user_id = u.id
JOIN sso_applications a ON a.id = uaa.app_id;


CREATE OR REPLACE FUNCTION user_has_app_access(
  p_user_email VARCHAR,
  p_app_key VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
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


INSERT INTO sso_applications (app_key, app_name, app_description, app_url)
VALUES 
  ('tune', 'NotifyTune+', 'Social Media Network', 'https://tune.notifycode.org'),
  ('fashion', 'NotifyFashion+', 'Notifycode Fashion Brand', 'https://fashion.notifycode.org'),
  ('delivery', 'NotifyDelivery+', 'Delivery Service', 'https://delivery.notifycode.org'),
  ('tv', 'NotifyTV+', 'Television Platform', 'https://tv.notifycode.org'),
  ('cast', 'Notifycast+', 'News Platform', 'https://cast.notifycode.org'),
  ('nezaai', 'NezaAI', 'Notifycode AI Research', 'https://ai.notifycode.org')
ON CONFLICT (app_key) DO NOTHING;
