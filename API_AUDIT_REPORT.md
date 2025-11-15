# Informe de Auditoría de la API

Este informe detalla las discrepancias encontradas entre la implementación de la API y su documentación en `API_DOCUMENTATION.md`.

## 🔐 Autenticación (`/api/auth`)

### Endpoints Faltantes

- `GET /api/auth/refresh`: Obtiene un nuevo token de acceso a partir de un token de actualización.
- `POST /api/auth/change-password`: Permite a un usuario cambiar su contraseña.
- `DELETE /api/auth/account`: Permite a un usuario eliminar su cuenta.
- `GET /api/auth/google`: Inicia el proceso de autenticación con Google.
- `GET /api/auth/google/callback`: Callback para la autenticación con Google.

### Endpoints Incorrectos o Desactualizados

| Método | Ruta Documentada | Ruta Real | Notas |
| --- | --- | --- | --- |
| POST | `/auth/register` | `/api/auth/register` | La ruta documentada omite el prefijo `/api`. |
| POST | `/auth/login` | `/api/auth/login` | La ruta documentada omite el prefijo `/api`. |
| POST | `/auth/logout` | `/api/auth/logout` | La ruta documentada omite el prefijo `/api`. |
| GET | `/users/profile` | `/api/auth/profile` | Documentado en la sección incorrecta (`/users`) y con la ruta incorrecta. |
| PUT | `/users/profile` | `/api/auth/profile` | Documentado en la sección incorrecta (`/users`) y con la ruta incorrecta. |

## 📊 Panel de Control (`/api/dashboard`)

### Endpoints Faltantes

- `GET /api/dashboard`: Obtiene todos los datos del panel de control.
- `GET /api/dashboard/inventory-summary`: Obtiene un resumen del inventario.
- `GET /api/dashboard/consumption-stats`: Obtiene estadísticas de consumo.

### Endpoints Incorrectos o Desactualizados

| Método | Ruta Documentada | Ruta Real | Notas |
| --- | --- | --- | --- |
| GET | `/dashboard/stats` | (No existe) | La documentación menciona un endpoint `/dashboard/stats` que no existe. Los endpoints reales son `/api/dashboard`, `/api/dashboard/inventory-summary` y `/api/dashboard/consumption-stats`. |

## 📦 Inventario (`/api/inventory`)

### Endpoints Faltantes

- `PUT /api/inventory/v2/:productId/move`: Mueve un producto a una ubicación diferente dentro del inventario.
- `GET /api/inventory/waste`: Obtiene estadísticas sobre el desperdicio de alimentos (actualmente devuelve datos mock).
- `GET /api/inventory/location/:location`: Obtiene el inventario de una ubicación específica (actualmente devuelve datos mock).

### Endpoints Incorrectos o Desactualizados

| Método | Ruta Documentada | Ruta Real | Notas |
| --- | --- | --- | --- |
| GET | `/inventory` | `/api/inventory/v2` | La ruta documentada omite el prefijo `/api` y no especifica la versión `v2`. |
| POST | `/inventory` | `/api/inventory/v2` | La ruta documentada omite el prefijo `/api` y no especifica la versión `v2`. |
| PUT | `/inventory/:id` | `/api/inventory/v2/:id` | La ruta documentada omite el prefijo `/api` y no especifica la versión `v2`. |
| DELETE | `/inventory/:id` | `/api/inventory/v2/:id` | La ruta documentada omite el prefijo `/api` y no especifica la versión `v2`. |
| POST | `/inventory/:id/consume` | `/api/inventory/v2/:id/consume` | La ruta documentada omite el prefijo `/api` y no especifica la versión `v2`. |
| GET | `/inventory/expiring` | `/api/inventory/v2/expiring` | La ruta documentada omite el prefijo `/api` y no especifica la versión `v2`. |
| GET | `/inventory/stats` | `/api/inventory/stats` | La ruta documentada omite el prefijo `/api`. |

### Duplicación y Confusión

La documentación lista los endpoints de inventario dos veces, una para `/inventory` y otra para `/inventory/v2`. Esto es confuso. La implementación actual utiliza los endpoints `/api/inventory/v2` y `/api/inventory/stats`, por lo que la documentación debería reflejar esto y eliminar la duplicación.

## 🔔 Notificaciones (`/api/notifications`)

### Endpoints Faltantes

- `POST /api/notifications/send-expiry-alert`: Envía una alerta de caducidad de productos.
- `POST /api/notifications/send-shopping-reminder`: Envía un recordatorio de la lista de compras.
- `GET /api/notifications/history`: Obtiene el historial de notificaciones del usuario.
- `PUT /api/notifications/:notificationId/read`: Marca una notificación como leída.

### Endpoints Incorrectos o Desactualizados

| Método | Ruta Documentada | Ruta Real | Notas |
| --- | --- | --- | --- |
| POST | `/notifications/register-device` | `/api/notifications/register-device` | La ruta documentada omite el prefijo `/api`. |
| DELETE | `/notifications/unregister-device` | `/api/notifications/unregister-device/:deviceId` | La ruta documentada omite el prefijo `/api` y el parámetro `:deviceId`. |
| POST | `/notifications/send` | `/api/notifications/send` | La ruta documentada omite el prefijo `/api`. |

## 📦 Productos (`/api/products`)

### Endpoints Faltantes

- `GET /api/products/search`: Busca productos por nombre, marca o categoría.
- `GET /api/products/popular`: Obtiene una lista de los productos más populares.
- `GET /api/products/categories`: Obtiene una lista de todas las categorías de productos.
- `PUT /api/products/:id`: Actualiza un producto existente.
- `DELETE /api/products/:id`: Elimina un producto existente.

### Endpoints Incorrectos o Desactualizados

| Método | Ruta Documentada | Ruta Real | Notas |
| --- | --- | --- | --- |
| GET | `/products` | `/api/products/search` | La documentación describe un endpoint genérico `/products` para obtener una lista de productos con paginación y filtros, pero la implementación real para la búsqueda es `/api/products/search`. |
| GET | `/products/:id` | `/api/products/:id` | La ruta documentada omite el prefijo `/api`. |
| GET | `/products/barcode/:barcode` | `/api/products/scan/:barcode` | La ruta documentada es incorrecta. |
| POST | `/products` | `/api/products` | La ruta documentada omite el prefijo `/api`. |

## 🍳 Recetas (`/api/recipes`)

### Endpoints Faltantes

- `GET /api/recipes/suggestions`: Obtiene sugerencias de recetas basadas en el inventario del usuario.
- `POST /api/recipes`: Crea una nueva receta.

### Endpoints Incorrectos o Desactualizados

| Método | Ruta Documentada | Ruta Real | Notas |
| --- | --- | --- | --- |
| GET | `/recipes` | `/api/recipes` | La ruta documentada omite el prefijo `/api`. |

## 🛒 Lista de Compras (`/api/shopping`)

### Sección Faltante

La documentación actual no incluye ninguna información sobre los endpoints de la lista de compras. La implementación real incluye los siguientes endpoints:

- `GET /api/shopping`: Obtiene la lista de compras del usuario.
- `POST /api/shopping`: Agrega un artículo a la lista de compras.
- `PUT /api/shopping/:id`: Actualiza un artículo en la lista de compras.
- `PUT /api/shopping/:id/move`: Mueve un artículo de la lista de compras al inventario.
- `DELETE /api/shopping/:id`: Elimina un artículo de la lista de compras.

## 👤 Usuarios (`/api/users`)

### Endpoints Faltantes

- `GET /api/users`: Obtiene una lista de todos los usuarios (solo para administradores).
- `GET /api/users/stats`: Obtiene estadísticas sobre los usuarios.
- `PUT /api/users/preferences`: Actualiza las preferencias del usuario.

### Endpoints Incorrectos o Desactualizados

La sección de usuarios en la documentación actual contiene endpoints que en realidad pertenecen a la sección de autenticación (`/users/profile`). La implementación real de los endpoints de usuarios es la que se ha detallado en la sección de "Endpoints Faltantes".