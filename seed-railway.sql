-- Seed básico para Railway - Solo algunos productos esenciales
-- Limpiar productos existentes (excepto el que ya tienes)
DELETE FROM products WHERE name != 'Confitura Albaricoque';

-- Insertar productos básicos uno por uno
INSERT INTO products (id, name, category, source, is_verified, created_at, updated_at) 
VALUES ('03b5578f-380d-4a63-83fd-97bd3901b242', 'Manzana', 'fruits', 'manual', TRUE, NOW(), NOW());

INSERT INTO products (id, name, category, source, is_verified, created_at, updated_at) 
VALUES ('a3926df0-5029-4d25-b66e-242b74baf521', 'Plátano', 'fruits', 'manual', TRUE, NOW(), NOW());

INSERT INTO products (id, name, category, source, is_verified, created_at, updated_at) 
VALUES ('b4037ef1-6130-5d36-c77f-353c85caf632', 'Naranja', 'fruits', 'manual', TRUE, NOW(), NOW());

INSERT INTO products (id, name, category, source, is_verified, created_at, updated_at) 
VALUES ('c5148fg2-7241-6e47-d88g-464d96dbg743', 'Tomate', 'vegetables', 'manual', TRUE, NOW(), NOW());

INSERT INTO products (id, name, category, source, is_verified, created_at, updated_at) 
VALUES ('d6259gh3-8352-7f58-e99h-575e07ech854', 'Lechuga', 'vegetables', 'manual', TRUE, NOW(), NOW());

INSERT INTO products (id, name, category, source, is_verified, created_at, updated_at) 
VALUES ('e7360hi4-9463-8g69-f00i-686f18fdi965', 'Zanahoria', 'vegetables', 'manual', TRUE, NOW(), NOW());

INSERT INTO products (id, name, category, source, is_verified, created_at, updated_at) 
VALUES ('f8471ij5-0574-9h70-g11j-797g29gej076', 'Leche', 'dairy', 'manual', TRUE, NOW(), NOW());

INSERT INTO products (id, name, category, source, is_verified, created_at, updated_at) 
VALUES ('g9582jk6-1685-0i81-h22k-808h30hfk187', 'Queso', 'dairy', 'manual', TRUE, NOW(), NOW());

INSERT INTO products (id, name, category, source, is_verified, created_at, updated_at) 
VALUES ('h0693kl7-2796-1j92-i33l-919i41igl298', 'Yogur', 'dairy', 'manual', TRUE, NOW(), NOW());

INSERT INTO products (id, name, category, source, is_verified, created_at, updated_at) 
VALUES ('i1704lm8-3807-2k03-j44m-020j52jhm309', 'Pollo', 'meat', 'manual', TRUE, NOW(), NOW());

INSERT INTO products (id, name, category, source, is_verified, created_at, updated_at) 
VALUES ('j2815mn9-4918-3l14-k55n-131k63kin410', 'Arroz', 'grains', 'manual', TRUE, NOW(), NOW());

INSERT INTO products (id, name, category, source, is_verified, created_at, updated_at) 
VALUES ('k3926no0-5029-4m25-l66o-242l74ljo521', 'Pasta', 'grains', 'manual', TRUE, NOW(), NOW());
