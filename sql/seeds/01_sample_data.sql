-- FreshKeeper v2.0.0 - Datos de Ejemplo
-- Datos de prueba para el desarrollo y testing

-- Usuario de ejemplo
INSERT INTO users (id, email, password_hash, name, language, preferences) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440000',
    'demo@freshkeeper.com',
    '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', -- password: demo123
    'Usuario Demo',
    'es',
    '{"theme": "light", "notifications": true}'
);

-- Productos de ejemplo
INSERT INTO products (id, barcode, name, brand, category, subcategory, source, nutritional_info) VALUES 
(
    '660e8400-e29b-41d4-a716-446655440001',
    '8480000123456',
    'Leche Entera',
    'Hacendado',
    'Lácteos',
    'Leche',
    'manual',
    '{"calories": 64, "protein": 3.2, "fat": 3.6, "carbs": 4.8}'
),
(
    '660e8400-e29b-41d4-a716-446655440002',
    '8480000123457',
    'Pan de Molde Integral',
    'Bimbo',
    'Panadería',
    'Pan',
    'manual',
    '{"calories": 247, "protein": 8.5, "fat": 4.2, "carbs": 41.0}'
),
(
    '660e8400-e29b-41d4-a716-446655440003',
    '8480000123458',
    'Manzanas Golden',
    'Frutas del Campo',
    'Frutas',
    'Manzanas',
    'manual',
    '{"calories": 52, "protein": 0.3, "fat": 0.2, "carbs": 14.0}'
),
(
    '660e8400-e29b-41d4-a716-446655440004',
    '8480000123459',
    'Pollo Entero',
    'Carrefour',
    'Carnes',
    'Pollo',
    'manual',
    '{"calories": 239, "protein": 27.3, "fat": 13.6, "carbs": 0.0}'
),
(
    '660e8400-e29b-41d4-a716-446655440005',
    '8480000123460',
    'Yogur Natural',
    'Danone',
    'Lácteos',
    'Yogur',
    'manual',
    '{"calories": 59, "protein": 10.0, "fat": 0.4, "carbs": 4.0}'
);

-- Items del usuario en diferentes listas
INSERT INTO user_items (user_id, product_id, list_type, quantity, unit, purchase_date, expiry_date, price, store) VALUES 
-- Nevera
(
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    'fridge',
    1,
    'litro',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '5 days',
    1.25,
    'Mercadona'
),
(
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440005',
    'fridge',
    4,
    'unidades',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '10 days',
    2.80,
    'Mercadona'
),
-- Congelador
(
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440004',
    'freezer',
    1,
    'kg',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '90 days',
    8.50,
    'Carrefour'
),
-- Despensa
(
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440002',
    'pantry',
    1,
    'paquete',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '7 days',
    1.95,
    'Mercadona'
),
-- Lista de compras
(
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440003',
    'shopping',
    2,
    'kg',
    NULL,
    NULL,
    NULL,
    NULL
);

-- Configuración de notificaciones del usuario
INSERT INTO user_notification_settings (user_id, expiry_days_before, shopping_reminder_days) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440000',
    3,
    ARRAY[1,3,5]
);

-- Caché de productos (simulando datos de APIs)
INSERT INTO product_cache (barcode, source, product_data, hit_count) VALUES 
(
    '8480000123456',
    'openfoodfacts',
    '{"product_name": "Leche Entera", "brands": "Hacendado", "categories": "Lácteos", "image_url": "https://example.com/leche.jpg"}',
    5
),
(
    '8480000123457',
    'chomp',
    '{"name": "Pan de Molde Integral", "brand": "Bimbo", "category": "Bakery", "nutrition": {"calories": 247}}',
    3
);

-- Token de dispositivo de ejemplo
INSERT INTO user_device_tokens (user_id, device_id, fcm_token, platform, app_version) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440000',
    'demo-device-001',
    'demo-fcm-token-12345',
    'android',
    '1.0.0'
);