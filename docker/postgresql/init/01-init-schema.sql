-- Script de inicialización para PostgreSQL
-- Esquema inicial para comparar con MongoDB

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tabla de usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    display_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    provider VARCHAR(50) NOT NULL DEFAULT 'email',
    provider_id VARCHAR(255),
    email_verified BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    
    -- Datos flexibles como JSONB (similar a MongoDB)
    profile JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{
        "language": "es",
        "units": "metric",
        "notifications": {
            "expiry_alerts": true,
            "shopping_reminders": true,
            "weekly_reports": false
        },
        "privacy": {
            "data_sharing": false,
            "analytics": true
        }
    }',
    stats JSONB DEFAULT '{
        "total_products_scanned": 0,
        "total_items_added": 0,
        "total_items_consumed": 0,
        "waste_prevented_kg": 0,
        "money_saved": 0,
        "last_login": null
    }',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Tabla de productos
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode VARCHAR(50) UNIQUE,
    
    -- Nombres en múltiples idiomas
    names JSONB DEFAULT '{}', -- {"es": "Leche", "en": "Milk", "fr": "Lait"}
    brand VARCHAR(255),
    category VARCHAR(100),
    
    -- Información nutricional flexible
    nutrition JSONB DEFAULT '{}',
    ingredients JSONB DEFAULT '{}',
    allergens TEXT[],
    
    -- Datos de APIs externas
    api_data JSONB DEFAULT '{}',
    
    -- Imágenes y multimedia
    images JSONB DEFAULT '{}',
    
    -- Estadísticas de uso
    stats JSONB DEFAULT '{
        "scan_count": 0,
        "add_count": 0,
        "last_scanned": null
    }',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de inventario
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Cantidad
    quantity_value DECIMAL(10,3) NOT NULL CHECK (quantity_value > 0),
    quantity_unit VARCHAR(20) NOT NULL CHECK (quantity_unit IN ('kg', 'g', 'l', 'ml', 'unit', 'package')),
    
    -- Fechas importantes
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE NOT NULL,
    opened_date DATE,
    
    -- Información de compra
    purchase JSONB DEFAULT '{}', -- {price, currency, store, batch}
    
    -- Ubicación y estado
    location VARCHAR(20) NOT NULL DEFAULT 'pantry' CHECK (location IN ('fridge', 'freezer', 'pantry', 'counter', 'other')),
    status VARCHAR(20) NOT NULL DEFAULT 'fresh' CHECK (status IN ('fresh', 'near_expiry', 'expired', 'consumed', 'discarded')),
    
    -- Notas del usuario
    notes TEXT,
    
    -- Configuración de alertas
    alerts JSONB DEFAULT '{
        "enabled": true,
        "days_before_expiry": 3,
        "notification_sent": false,
        "last_notification": null
    }',
    
    -- Historial de consumo
    consumption JSONB DEFAULT '[]',
    
    -- Metadatos de cómo se agregó
    added_by JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stats_last_login ON users USING GIN ((stats->'last_login'));

CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_names ON products USING GIN (names);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);

CREATE INDEX idx_inventory_user_expiry ON inventory(user_id, expiration_date);
CREATE INDEX idx_inventory_user_status ON inventory(user_id, status);
CREATE INDEX idx_inventory_user_location ON inventory(user_id, location);
CREATE INDEX idx_inventory_expiry_status ON inventory(expiration_date, status);
CREATE INDEX idx_inventory_alerts ON inventory USING GIN (alerts);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar estado basado en fecha de expiración
CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar estado basado en fecha de expiración
    IF NEW.expiration_date <= CURRENT_DATE THEN
        NEW.status = 'expired';
    ELSIF NEW.expiration_date <= CURRENT_DATE + INTERVAL '3 days' THEN
        NEW.status = 'near_expiry';
    ELSIF NEW.status NOT IN ('consumed', 'discarded') THEN
        NEW.status = 'fresh';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_status_trigger 
    BEFORE INSERT OR UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_inventory_status();

-- Datos de ejemplo
INSERT INTO users (email, display_name, provider) VALUES 
('test@freshkeeper.com', 'Usuario de Prueba', 'email'),
('demo@freshkeeper.com', 'Usuario Demo', 'email');

INSERT INTO products (barcode, names, brand, category) VALUES 
('1234567890123', '{"es": "Leche Entera", "en": "Whole Milk"}', 'Marca Test', 'dairy'),
('9876543210987', '{"es": "Pan Integral", "en": "Whole Bread"}', 'Panadería', 'bakery');

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ PostgreSQL inicializado correctamente para FreshKeeper';
    RAISE NOTICE '📊 Tablas creadas: users, products, inventory';
    RAISE NOTICE '🔍 Índices optimizados creados';
    RAISE NOTICE '⚡ Triggers automáticos configurados';
    RAISE NOTICE '📝 Datos de ejemplo insertados';
END $$;