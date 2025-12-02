-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE user_type AS ENUM ('customer', 'contractor', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contractor_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quote_status AS ENUM ('pending', 'responded', 'accepted', 'rejected', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contract_status AS ENUM ('confirmed', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'image', 'quote');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    profile_image VARCHAR(500),
    user_type user_type NOT NULL DEFAULT 'customer',
    google_id VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contractors table
CREATE TABLE IF NOT EXISTS contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    business_number VARCHAR(20) NOT NULL,
    description TEXT,
    specialties VARCHAR(50)[] DEFAULT '{}',
    service_areas VARCHAR(50)[] DEFAULT '{}',
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    status contractor_status DEFAULT 'pending',
    rejection_reason TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    sub_category VARCHAR(50),
    apartment_name VARCHAR(100),
    area_size INTEGER,
    location_city VARCHAR(50),
    location_district VARCHAR(50),
    duration_days INTEGER,
    cost_min INTEGER,
    cost_max INTEGER,
    like_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    completed_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio images table
CREATE TABLE IF NOT EXISTS portfolio_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    image_type VARCHAR(20) DEFAULT 'after',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio likes table
CREATE TABLE IF NOT EXISTS portfolio_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, user_id)
);

-- Portfolio saves table
CREATE TABLE IF NOT EXISTS portfolio_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, user_id)
);

-- Quote requests table
CREATE TABLE IF NOT EXISTS quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id),
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    apartment_name VARCHAR(100),
    area_size INTEGER,
    location_city VARCHAR(50),
    location_district VARCHAR(50),
    budget_min INTEGER,
    budget_max INTEGER,
    desired_start_date DATE,
    status quote_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quote request images table
CREATE TABLE IF NOT EXISTS quote_request_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quote responses table
CREATE TABLE IF NOT EXISTS quote_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    estimated_cost INTEGER NOT NULL,
    estimated_duration INTEGER,
    description TEXT,
    is_accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quote_request_id, contractor_id)
);

-- Chat rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    quote_request_id UUID REFERENCES quote_requests(id),
    last_message TEXT,
    last_message_at TIMESTAMP,
    customer_unread INTEGER DEFAULT 0,
    contractor_unread INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, contractor_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_request_id UUID NOT NULL REFERENCES quote_requests(id),
    quote_response_id UUID NOT NULL REFERENCES quote_responses(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    contractor_id UUID NOT NULL REFERENCES contractors(id),
    contract_amount INTEGER NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    commission_amount INTEGER,
    status contract_status DEFAULT 'confirmed',
    start_date DATE,
    end_date DATE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    notification_type VARCHAR(50) NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    device_info VARCHAR(200),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_contractors_user_id ON contractors(user_id);
CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors(status);
CREATE INDEX IF NOT EXISTS idx_portfolios_contractor_id ON portfolios(contractor_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_category ON portfolios(category);
CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON portfolios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_images_portfolio_id ON portfolio_images(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_likes_user_id ON portfolio_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_saves_user_id ON portfolio_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_customer_id ON quote_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_contractor_id ON quote_requests(contractor_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_customer_id ON chat_rooms(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_contractor_id ON chat_rooms(contractor_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
