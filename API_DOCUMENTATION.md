# Documentación de la API de FreshKeeper

## Información General

- **URL Base**: `/api`
- **Versión**: 2.0.0
- **Autenticación**: JWT Bearer Token

Esta documentación describe la versión 2 de la API de FreshKeeper, que incluye un nuevo diseño de inventario y numerosas mejoras.

## Endpoints

### 🔐 Autenticación (`/api/auth`)

#### `POST /api/auth/register`

Registra un nuevo usuario en el sistema.

- **Request Body**:
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string"
  }
  ```

- **Response (201 - Created)**:
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

#### `POST /api/auth/login`

Inicia sesión con las credenciales del usuario.

- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```

- **Response (200 - OK)**:
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

#### `POST /api/auth/logout`

Cierra la sesión del usuario y elimina el token.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "message": "Sesión cerrada exitosamente"
  }
  ```

#### `GET /api/auth/refresh`

Refresca el token de autenticación del usuario.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {
      "token": "string"
    }
  }
  ```

#### `POST /api/auth/change-password`

Permite al usuario cambiar su contraseña.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "currentPassword": "string",
    "newPassword": "string"
  }
  ```

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "message": "Contraseña actualizada correctamente"
  }
  ```

#### `DELETE /api/auth/account`

Elimina la cuenta del usuario autenticado.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "message": "Cuenta eliminada correctamente"
  }
  ```

#### `GET /api/auth/google`

Inicia el proceso de autenticación con Google.

- **Response**: Redirige al usuario a la página de autenticación de Google.

#### `GET /api/auth/google/callback`

Callback que Google utiliza para redirigir al usuario después de la autenticación.

- **Response**: Redirige al cliente con un token de autenticación.

### 📊 Panel de Control (`/api/dashboard`)

#### `GET /api/dashboard`

Obtiene un resumen general del estado del usuario, incluyendo productos que expiran pronto, niveles de inventario y actividad reciente.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {
      "expiringSoon": [],
      "inventoryLevels": [],
      "recentActivity": []
    }
  }
  ```

#### `GET /api/dashboard/inventory-summary`

Proporciona un resumen del inventario, incluyendo el número total de artículos y la cantidad por ubicación.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {
      "totalItems": "number",
      "locations": [
        {
          "location": "string",
          "count": "number"
        }
      ]
    }
  }
  ```

#### `GET /api/dashboard/consumption-stats`

Devuelve estadísticas sobre el consumo de productos, el desperdicio y los patrones de compra.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Query Parameters**:
  - `period` (string): `week` o `month` (default: `week`)

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {
      "consumedItems": "number",
      "wastedItems": "number",
      "purchasePatterns": "object"
    }
  }
  ```

### 📦 Inventario (`/api/inventory`)

#### `GET /api/inventory/v2`

Obtiene el inventario del usuario con filtros y paginación.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Query Parameters**:
  - `page` (number): Número de página.
  - `limit` (number): Resultados por página.
  - `sort` (string): Campo por el que ordenar.
  - `order` (string): `asc` o `desc`.
  - `search` (string): Término de búsqueda.

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": [],
    "pagination": {}
  }
  ```

#### `POST /api/inventory/v2`

Añade un producto al inventario del usuario.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "productId": "string",
    "location": "string",
    "quantity": "number",
    "expiryDate": "string"
  }
  ```

- **Response (201 - Created)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `PUT /api/inventory/v2/:userProductId`

Actualiza un producto existente en el inventario.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "quantity": "number",
    "expiryDate": "string"
  }
  ```

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `DELETE /api/inventory/v2/:userProductId`

Elimina un producto del inventario.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "message": "Producto eliminado del inventario"
  }
  ```

#### `POST /api/inventory/v2/:userProductId/consume`

Registra el consumo de una cantidad de un producto.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "consumedQuantity": "number"
  }
  ```

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `PUT /api/inventory/v2/:productId/move`

Mueve un producto a una nueva ubicación.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "from": "string",
    "to": "string",
    "quantity": "number"
  }
  ```

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `GET /api/inventory/expiring`

Obtiene una lista de productos que están a punto de expirar.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Query Parameters**:
  - `days` (number): Número de días para considerar un producto como "expirando".

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```

#### `GET /api/inventory/waste`

Obtiene estadísticas sobre el desperdicio de alimentos.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `GET /api/inventory/location/:location`

Obtiene todos los productos de una ubicación específica.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```

### 🔔 Notificaciones (`/api/notifications`)

#### `POST /api/notifications/register-device`

Registra un dispositivo para recibir notificaciones push.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "token": "string",
    "platform": "string" 
  }
  ```

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "message": "Dispositivo registrado para notificaciones"
  }
  ```

#### `DELETE /api/notifications/unregister-device/:deviceId`

Elimina el registro de un dispositivo para notificaciones.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "message": "Dispositivo desregistrado"
  }
  ```

#### `POST /api/notifications/send-expiry-alert`

Envía una alerta de expiración de un producto.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "userProductId": "string"
  }
  ```

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "message": "Alerta de expiración enviada"
  }
  ```

#### `POST /api/notifications/send-shopping-reminder`

Envía un recordatorio para la lista de compras.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "message": "Recordatorio de compras enviado"
  }
  ```

#### `GET /api/notifications/history`

Obtiene el historial de notificaciones del usuario.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```

#### `PUT /api/notifications/:notificationId/read`

Marca una notificación como leída.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

### 🛍️ Productos (`/api/products`)

#### `GET /api/products`

Obtiene una lista de todos los productos.

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```

#### `POST /api/products`

Crea un nuevo producto.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "name": "string",
    "brand": "string",
    "category": "string"
  }
  ```

- **Response (201 - Created)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `GET /api/products/search`

Busca productos por un término de búsqueda.

- **Query Parameters**:
  - `q` (string): Término de búsqueda.

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```

#### `GET /api/products/popular`

Obtiene una lista de los productos más populares.

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```

#### `GET /api/products/categories`

Obtiene todas las categorías de productos.

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```

#### `GET /api/products/scan/:barcode`

Busca un producto por su código de barras.

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `GET /api/products/:id`

Obtiene un producto por su ID.

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `PUT /api/products/:id`

Actualiza un producto existente.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "name": "string",
    "brand": "string",
    "category": "string"
  }
  ```

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `DELETE /api/products/:id`

Elimina un producto.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "message": "Producto eliminado"
  }
  ```

### 🍳 Recetas (`/api/recipes`)

#### `GET /api/recipes`

Obtiene una lista de recetas, con la opción de filtrar por ingredientes.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Query Parameters**:
  - `ingredients` (string): Lista de ingredientes separados por comas para sugerir recetas.

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```

#### `POST /api/recipes`

Crea una nueva receta.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "title": "string",
    "description": "string",
    "ingredients": [],
    "instructions": "string"
  }
  ```

- **Response (201 - Created)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `GET /api/recipes/suggestions`

Obtiene sugerencias de recetas basadas en el inventario del usuario.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```

### 🛒 Lista de Compras (`/api/shopping`)

#### `GET /api/shopping`

Obtiene la lista de compras del usuario.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```

#### `POST /api/shopping`

Añade un producto a la lista de compras.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "productId": "string",
    "quantity": "number"
  }
  ```

- **Response (201 - Created)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `PUT /api/shopping/:id`

Actualiza un producto en la lista de compras.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "quantity": "number",
    "purchased": "boolean"
  }
  ```

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `PUT /api/shopping/:id/move`

Mueve un producto de la lista de compras al inventario.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "location": "string"
  }
  ```

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "message": "Producto movido al inventario"
  }
  ```

#### `DELETE /api/shopping/:id`

Elimina un producto de la lista de compras.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "message": "Producto eliminado de la lista de compras"
  }
  ```

### 👤 Usuarios (`/api/users`)

#### `GET /api/users`

Obtiene una lista de todos los usuarios (solo para administradores).

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": []
  }
  ```

#### `GET /api/users/profile`

Obtiene el perfil del usuario autenticado.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `PUT /api/users/profile`

Actualiza el perfil del usuario autenticado.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "name": "string",
    "email": "string"
  }
  ```

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `GET /api/users/stats`

Obtiene estadísticas sobre los usuarios (solo para administradores).

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```

#### `PUT /api/users/preferences`

Actualiza las preferencias del usuario.

- **Headers**:
  - `Authorization`: `Bearer <token>`

- **Request Body**:
  ```json
  {
    "notifications": "boolean",
    "theme": "string"
  }
  ```

- **Response (200 - OK)**:
  ```json
  {
    "success": true,
    "data": {}
  }
  ```
## Búsqueda por Nombre

- Endpoint: `GET /api/products/search/name`
- Parámetros:
  - `q` (string, requerido): texto de búsqueda.
  - `lang` (string, opcional, por defecto `es`): idioma preferido.
- Decisiones y respuestas:
  - `found`: devuelve `product` único de fuente `local` u `openfoodfacts`.
  - `list`: devuelve `products` sugeridos, priorizando verificados y con marca.
  - `clarify`: devuelve `questions` para aclarar si es con marca o fresco/sin marca.
  - `generated`: devuelve `product` genérico creado por LLM, persistido con `source=llm` y `isVerified=false`.
  - `none`: consulta vacía.
- Persistencia de productos LLM:
  - Guarda `brand=null`, `imageUrl=null`, `ingredients` como string, nutrición en `nutritionalInfo`.
  - `source` se establece en `ProductSource.llm` directamente (sin fallback).

## Búsqueda por Código de Barras

- Endpoint: `GET /api/products/scan/:barcode`
- Flujo:
  - Busca primero en BD local por `barcode`.
  - Si no existe, consulta fuentes externas (OpenFoodFacts, Chomp) mediante `ProductAPIService.getProductData`.
  - Normaliza datos y persiste en BD con `source` según la fuente (`openfoodfacts`, `chomp`). `isVerified=false`.
  - Asocia el producto al usuario si viene autenticado.
- Respuestas:
  - `success=true` con `data=product` y `source=local|openfoodfacts|chomp`.
  - `404` si no se encuentra en ninguna fuente.

## Pendientes

- Añadir trazas/métricas del uso LLM (cuándo y para qué consultas).
- Caching simple para búsquedas por nombre (memoria o tabla de cache).
- Rate limiting para el endpoint de nombre si esperas alto tráfico.
- Documentación breve del endpoint en este archivo (completada) y ampliar ejemplos.