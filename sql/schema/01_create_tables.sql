-- FreshKeeper v2.0.0 - PostgreSQL Schema
-- Creación de todas las tablas del nuevo diseño unificado

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tabla de usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de productos (unificada: API + manual + catálogo)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    description TEXT,
    image_url TEXT,
    nutritional_info JSONB DEFAULT '{}',
    allergens TEXT[],
    ingredients TEXT,
    source VARCHAR(20) CHECK (source IN ('openfoodfacts', 'chomp', 'manual', 'catalog')) DEFAULT 'manual',
    source_id VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla unificada de items del usuario (shopping, fridge, freezer, pantry)
CREATE TABLE user_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    list_type VARCHAR(20) NOT NULL CHECK (list_type IN ('shopping', 'fridge', 'freezer', 'pantry')),
    quantity INTEGER DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'units',
    purchase_date DATE,
    expiry_date DATE,
    price DECIMAL(10,2),
    store VARCHAR(255),
    notes TEXT,
    is_consumed BOOLEAN DEFAULT false,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Índice único para evitar duplicados en la misma lista
    UNIQUE(user_id, product_id, list_type, purchase_date, expiry_date)
);

-- Tabla de historial de movimientos
CREATE TABLE item_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_item_id UUID REFERENCES user_items(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('add', 'remove', 'move', 'consume', 'expire', 'update')),
    from_list VARCHAR(20) CHECK (from_list IN ('shopping', 'fridge', 'freezer', 'pantry')),
    to_list VARCHAR(20) CHECK (to_list IN ('shopping', 'fridge', 'freezer', 'pantry')),
    quantity INTEGER NOT NULL,
    unit VARCHAR(50) DEFAULT 'units',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de caché de productos (APIs externas)
CREATE TABLE product_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode VARCHAR(50) NOT NULL,
    source VARCHAR(20) NOT NULL CHECK (source IN ('openfoodfacts', 'chomp')),
    product_data JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    hit_count INTEGER DEFAULT 1,
    
    UNIQUE(barcode, source)
);

-- Tabla de tokens de dispositivos para notificaciones push
CREATE TABLE user_device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    fcm_token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
    app_version VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, device_id)
);

-- Tabla de historial de notificaciones
CREATE TABLE notification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token_id UUID REFERENCES user_device_tokens(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'read', 'clicked'))
);

-- Tabla de configuración de notificaciones por usuario
CREATE TABLE user_notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expiry_alerts BOOLEAN DEFAULT true,
    expiry_days_before INTEGER DEFAULT 2,
    shopping_reminders BOOLEAN DEFAULT true,
    shopping_reminder_time TIME DEFAULT '10:00:00',
    shopping_reminder_days INTEGER[] DEFAULT ARRAY[1,3,5], -- Lunes, Miércoles, Viernes
    weekly_summary BOOLEAN DEFAULT true,
    weekly_summary_day INTEGER DEFAULT 0, -- Domingo
    weekly_summary_time TIME DEFAULT '18:00:00',
    recommendations BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);