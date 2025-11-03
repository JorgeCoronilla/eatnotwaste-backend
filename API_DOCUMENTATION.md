# FreshKeeper API Documentation

## Información General

- **Base URL**: `http://localhost:3001`
- **Versión**: 1.0.0
- **Autenticación**: JWT Bearer Token

## Endpoints

### 🔐 Autenticación (`/auth`)

#### POST `/auth/register`
Registra un nuevo usuario en el sistema.

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    },
    "token": "string"
  }
}
```

#### POST `/auth/login`
Inicia sesión con credenciales existentes.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    },
    "token": "string"
  }
}
```

#### POST `/auth/logout`
Cierra la sesión del usuario actual.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

### 👤 Usuarios (`/users`)

#### GET `/users/profile`
Obtiene el perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "email": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

#### PUT `/users/profile`
Actualiza el perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "string",
  "email": "string"
}
```

### 📦 Productos (`/products`)

#### GET `/products`
Obtiene la lista de productos con paginación y filtros.

**Query Parameters:**
- `page` (number): Número de página (default: 1)
- `limit` (number): Elementos por página (default: 10)
- `search` (string): Término de búsqueda
- `category` (string): Filtrar por categoría

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "string",
        "barcode": "string",
        "name": "string",
        "brand": "string",
        "category": "string",
        "nutritionalInfo": {
          "calories": "number",
          "protein": "number",
          "carbs": "number",
          "fat": "number",
          "fiber": "number",
          "sugar": "number"
        },
        "imageUrl": "string"
      }
    ],
    "pagination": {
      "page": "number",
      "limit": "number",
      "total": "number",
      "pages": "number"
    }
  }
}
```

#### GET `/products/:id`
Obtiene un producto específico por ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "barcode": "string",
    "name": "string",
    "brand": "string",
    "category": "string",
    "nutritionalInfo": "object",
    "imageUrl": "string"
  }
}
```

#### GET `/products/barcode/:barcode`
Busca un producto por código de barras.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "barcode": "string",
    "name": "string",
    "brand": "string",
    "category": "string"
  }
}
```

#### POST `/products`
Crea un nuevo producto.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "barcode": "string",
  "name": "string",
  "brand": "string",
  "category": "string",
  "nutritionalInfo": {
    "calories": "number",
    "protein": "number",
    "carbs": "number",
    "fat": "number",
    "fiber": "number",
    "sugar": "number"
  },
  "imageUrl": "string"
}
```

### 📋 Inventario (`/inventory`)

#### GET `/inventory`
Obtiene el inventario del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `listType` (string): Filtrar por tipo de lista (fridge, pantry, freezer, shopping)
- `expiring` (boolean): Solo productos próximos a vencer

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "product": {
        "id": "string",
        "name": "string",
        "brand": "string",
        "category": "string"
      },
      "listType": "string",
      "quantity": "number",
      "unit": "string",
      "purchaseDate": "string",
      "expiryDate": "string",
      "notes": "string"
    }
  ]
}
```

#### POST `/inventory`
Agrega un item al inventario.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "string",
  "listType": "fridge|pantry|freezer|shopping",
  "quantity": "number",
  "unit": "string",
  "purchaseDate": "string",
  "expiryDate": "string",
  "notes": "string"
}
```

#### PUT `/inventory/:id`
Actualiza un item del inventario.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "quantity": "number",
  "unit": "string",
  "expiryDate": "string",
  "notes": "string"
}
```

#### DELETE `/inventory/:id`
Elimina un item del inventario.

**Headers:**
```
Authorization: Bearer <token>
```

### 🍳 Recetas (`/recipes`)

#### GET `/recipes`
Obtiene recetas basadas en ingredientes disponibles.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `ingredients` (string): Lista de ingredientes separados por coma

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "ingredients": ["string"],
      "instructions": ["string"],
      "prepTime": "number",
      "cookTime": "number",
      "servings": "number"
    }
  ]
}
```

### 🔔 Notificaciones (`/notifications`)

#### POST `/notifications/register-device`
Registra un dispositivo para notificaciones push.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "token": "string",
  "platform": "ios|android|web"
}
```

#### DELETE `/notifications/unregister-device`
Desregistra un dispositivo.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "token": "string"
}
```

#### POST `/notifications/send`
Envía notificaciones (solo para administradores).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "type": "expiry_reminder|shopping_reminder|general",
  "title": "string",
  "body": "string",
  "data": "object"
}
```

### 📊 Dashboard (`/dashboard`)

#### GET `/dashboard/stats`
Obtiene estadísticas del dashboard del usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalItems": "number",
    "expiringItems": "number",
    "categoriesCount": "object",
    "recentActivity": "array"
  }
}
```

## Códigos de Estado HTTP

- `200` - OK: Solicitud exitosa
- `201` - Created: Recurso creado exitosamente
- `400` - Bad Request: Error en la solicitud
- `401` - Unauthorized: No autenticado
- `403` - Forbidden: No autorizado
- `404` - Not Found: Recurso no encontrado
- `500` - Internal Server Error: Error del servidor

## Estructura de Respuesta de Error

```json
{
  "success": false,
  "error": {
    "message": "string",
    "code": "string",
    "details": "object"
  }
}
```

## Autenticación

La API utiliza JWT (JSON Web Tokens) para la autenticación. Después de iniciar sesión exitosamente, incluye el token en el header `Authorization` de todas las solicitudes protegidas:

```
Authorization: Bearer <your-jwt-token>
```

## Ejemplos de Uso

### Registro de Usuario
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "password": "password123"
  }'
```

### Obtener Inventario
```bash
curl -X GET http://localhost:3001/inventory \
  -H "Authorization: Bearer <your-token>"
```

### Agregar Producto al Inventario
```bash
curl -X POST http://localhost:3001/inventory \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-id",
    "listType": "fridge",
    "quantity": 1,
    "unit": "unidades",
    "purchaseDate": "2024-01-15",
    "expiryDate": "2024-01-22",
    "notes": "Comprado en el supermercado"
  }'
```

## Configuración de Base de Datos

La aplicación utiliza PostgreSQL con Prisma ORM. Para configurar la base de datos:

1. Configura las variables de entorno en `.env`
2. Ejecuta `npm run db:push` para aplicar el esquema
3. Ejecuta `npm run db:setup` para poblar con datos iniciales

## Health Check

Endpoint para verificar el estado del servidor:

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```