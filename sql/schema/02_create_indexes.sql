-- FreshKeeper v2.0.0 - Índices Optimizados
-- Índices estratégicos para mejorar el rendimiento

-- Índices para tabla users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_last_login ON users(last_login);

-- Índices para tabla products
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_products_brand ON products(brand) WHERE brand IS NOT NULL;
CREATE INDEX idx_products_category ON products(category, subcategory);
CREATE INDEX idx_products_source ON products(source);
CREATE INDEX idx_products_verified ON products(is_verified) WHERE is_verified = true;

-- Índices para tabla user_items (consultas más frecuentes)
CREATE INDEX idx_user_items_user_list ON user_items(user_id, list_type);
CREATE INDEX idx_user_items_expiry ON user_items(expiry_date) WHERE expiry_date IS NOT NULL AND is_consumed = false;
CREATE INDEX idx_user_items_product ON user_items(product_id);
CREATE INDEX idx_user_items_consumed ON user_items(is_consumed, consumed_at);
CREATE INDEX idx_user_items_purchase_date ON user_items(purchase_date) WHERE purchase_date IS NOT NULL;

-- Índice compuesto para dashboard (consulta unificada)
CREATE INDEX idx_user_items_dashboard ON user_items(user_id, list_type, is_consumed, expiry_date);

-- Índices para tabla item_movements
CREATE INDEX idx_item_movements_user ON item_movements(user_id, created_at DESC);
CREATE INDEX idx_item_movements_product ON item_movements(product_id, created_at DESC);
CREATE INDEX idx_item_movements_type ON item_movements(movement_type, created_at DESC);
CREATE INDEX idx_item_movements_user_item ON item_movements(user_item_id) WHERE user_item_id IS NOT NULL;

-- Índices para tabla product_cache
CREATE INDEX idx_product_cache_barcode_source ON product_cache(barcode, source);
CREATE INDEX idx_product_cache_expires ON product_cache(expires_at);
CREATE INDEX idx_product_cache_hit_count ON product_cache(hit_count DESC);
CREATE INDEX idx_product_cache_last_updated ON product_cache(last_updated);

-- Índices para tabla user_device_tokens
CREATE INDEX idx_device_tokens_user ON user_device_tokens(user_id) WHERE is_active = true;
CREATE INDEX idx_device_tokens_device ON user_device_tokens(device_id);
CREATE INDEX idx_device_tokens_platform ON user_device_tokens(platform) WHERE is_active = true;
CREATE INDEX idx_device_tokens_last_used ON user_device_tokens(last_used DESC);

-- Índices para tabla notification_history
CREATE INDEX idx_notification_history_user ON notification_history(user_id, sent_at DESC);
CREATE INDEX idx_notification_history_type ON notification_history(notification_type, sent_at DESC);
CREATE INDEX idx_notification_history_status ON notification_history(status, sent_at DESC);
CREATE INDEX idx_notification_history_device ON notification_history(device_token_id) WHERE device_token_id IS NOT NULL;

-- Índices para tabla user_notification_settings
CREATE INDEX idx_notification_settings_user ON user_notification_settings(user_id);
CREATE INDEX idx_notification_settings_expiry ON user_notification_settings(expiry_alerts) WHERE expiry_alerts = true;
CREATE INDEX idx_notification_settings_shopping ON user_notification_settings(shopping_reminders) WHERE shopping_reminders = true;
CREATE INDEX idx_notification_settings_weekly ON user_notification_settings(weekly_summary) WHERE weekly_summary = true;

-- Índices parciales para optimizar consultas específicas
CREATE INDEX idx_user_items_expiring_soon ON user_items(user_id, expiry_date, list_type) 
WHERE expiry_date IS NOT NULL 
AND is_consumed = false 
AND list_type IN ('fridge', 'freezer', 'pantry');

CREATE INDEX idx_user_items_shopping_active ON user_items(user_id, created_at DESC) 
WHERE list_type = 'shopping' 
AND is_consumed = false;

-- Índice para búsqueda de productos por texto
CREATE INDEX idx_products_search ON products USING gin(
    (setweight(to_tsvector('spanish', coalesce(name, '')), 'A') ||
     setweight(to_tsvector('spanish', coalesce(brand, '')), 'B') ||
     setweight(to_tsvector('spanish', coalesce(category, '')), 'C'))
);