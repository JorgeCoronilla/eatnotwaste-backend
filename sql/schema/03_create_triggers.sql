-- FreshKeeper v2.0.0 - Triggers Automáticos
-- Triggers para actualización automática de timestamps y logging

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at en todas las tablas relevantes
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_items_updated_at 
    BEFORE UPDATE ON user_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_device_tokens_updated_at 
    BEFORE UPDATE ON user_device_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_settings_updated_at 
    BEFORE UPDATE ON user_notification_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para registrar movimientos automáticamente
CREATE OR REPLACE FUNCTION log_item_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- INSERT: Agregar item
    IF TG_OP = 'INSERT' THEN
        INSERT INTO item_movements (
            user_id, user_item_id, product_id, movement_type, 
            to_list, quantity, unit, metadata
        ) VALUES (
            NEW.user_id, NEW.id, NEW.product_id, 'add',
            NEW.list_type, NEW.quantity, NEW.unit,
            jsonb_build_object(
                'purchase_date', NEW.purchase_date,
                'expiry_date', NEW.expiry_date,
                'price', NEW.price,
                'store', NEW.store
            )
        );
        RETURN NEW;
    END IF;

    -- UPDATE: Mover item o cambiar estado
    IF TG_OP = 'UPDATE' THEN
        -- Si cambió de lista
        IF OLD.list_type != NEW.list_type THEN
            INSERT INTO item_movements (
                user_id, user_item_id, product_id, movement_type,
                from_list, to_list, quantity, unit, metadata
            ) VALUES (
                NEW.user_id, NEW.id, NEW.product_id, 'move',
                OLD.list_type, NEW.list_type, NEW.quantity, NEW.unit,
                jsonb_build_object(
                    'old_quantity', OLD.quantity,
                    'new_quantity', NEW.quantity
                )
            );
        END IF;

        -- Si se marcó como consumido
        IF OLD.is_consumed = false AND NEW.is_consumed = true THEN
            INSERT INTO item_movements (
                user_id, user_item_id, product_id, movement_type,
                from_list, quantity, unit, metadata
            ) VALUES (
                NEW.user_id, NEW.id, NEW.product_id, 'consume',
                NEW.list_type, NEW.quantity, NEW.unit,
                jsonb_build_object(
                    'consumed_at', NEW.consumed_at,
                    'expiry_date', NEW.expiry_date
                )
            );
        END IF;

        -- Si cambió la cantidad significativamente
        IF OLD.quantity != NEW.quantity AND ABS(OLD.quantity - NEW.quantity) > 0 THEN
            INSERT INTO item_movements (
                user_id, user_item_id, product_id, movement_type,
                from_list, quantity, unit, metadata
            ) VALUES (
                NEW.user_id, NEW.id, NEW.product_id, 'update',
                NEW.list_type, NEW.quantity - OLD.quantity, NEW.unit,
                jsonb_build_object(
                    'old_quantity', OLD.quantity,
                    'new_quantity', NEW.quantity,
                    'change_reason', 'quantity_update'
                )
            );
        END IF;

        RETURN NEW;
    END IF;

    -- DELETE: Remover item
    IF TG_OP = 'DELETE' THEN
        INSERT INTO item_movements (
            user_id, user_item_id, product_id, movement_type,
            from_list, quantity, unit, metadata
        ) VALUES (
            OLD.user_id, OLD.id, OLD.product_id, 'remove',
            OLD.list_type, OLD.quantity, OLD.unit,
            jsonb_build_object(
                'removed_at', CURRENT_TIMESTAMP,
                'was_consumed', OLD.is_consumed
            )
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger para logging automático de movimientos
CREATE TRIGGER log_user_items_movements
    AFTER INSERT OR UPDATE OR DELETE ON user_items
    FOR EACH ROW EXECUTE FUNCTION log_item_movement();

-- Función para limpiar caché expirado
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM product_cache WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger para limpiar caché automáticamente (se ejecuta en cada INSERT)
CREATE TRIGGER cleanup_product_cache
    AFTER INSERT ON product_cache
    FOR EACH STATEMENT EXECUTE FUNCTION cleanup_expired_cache();

-- Función para actualizar hit_count en caché
CREATE OR REPLACE FUNCTION update_cache_hit_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.hit_count = OLD.hit_count + 1;
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar hit_count cuando se accede al caché
CREATE TRIGGER update_product_cache_hits
    BEFORE UPDATE ON product_cache
    FOR EACH ROW 
    WHEN (OLD.product_data IS NOT DISTINCT FROM NEW.product_data)
    EXECUTE FUNCTION update_cache_hit_count();

-- Función para validar configuración de notificaciones
CREATE OR REPLACE FUNCTION validate_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar días de la semana (0-6)
    IF NEW.shopping_reminder_days IS NOT NULL THEN
        IF array_length(NEW.shopping_reminder_days, 1) > 7 THEN
            RAISE EXCEPTION 'No se pueden configurar más de 7 días para recordatorios';
        END IF;
        
        IF EXISTS (SELECT 1 FROM unnest(NEW.shopping_reminder_days) AS day WHERE day < 0 OR day > 6) THEN
            RAISE EXCEPTION 'Los días de recordatorio deben estar entre 0 (domingo) y 6 (sábado)';
        END IF;
    END IF;

    -- Validar día de resumen semanal (0-6)
    IF NEW.weekly_summary_day < 0 OR NEW.weekly_summary_day > 6 THEN
        RAISE EXCEPTION 'El día de resumen semanal debe estar entre 0 (domingo) y 6 (sábado)';
    END IF;

    -- Validar días antes de expiración
    IF NEW.expiry_days_before < 0 OR NEW.expiry_days_before > 30 THEN
        RAISE EXCEPTION 'Los días antes de expiración deben estar entre 0 y 30';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para validar configuración de notificaciones
CREATE TRIGGER validate_user_notification_settings
    BEFORE INSERT OR UPDATE ON user_notification_settings
    FOR EACH ROW EXECUTE FUNCTION validate_notification_settings();