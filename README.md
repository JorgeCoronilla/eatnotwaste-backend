# FreshKeeper Backend

Backend API para FreshKeeper - Aplicación de gestión de inventario de alimentos con soporte para códigos de barras, múltiples idiomas y gestión inteligente de desperdicio alimentario. Rediseñado con PostgreSQL para máximo rendimiento y escalabilidad.

## 🚀 Características Implementadas

- **Escaneo de códigos de barras** con integración a OpenFoodFacts y ChompAPI
- **Sistema de listas inteligente** (compra, nevera, congelador, alacena) con flujo optimizado
- **Autenticación JWT** segura con refresh tokens
- **Soporte multiidioma** (ES, EN, FR, PT) con preferencias de usuario
- **Gestión de alergenos** y restricciones dietéticas
- **Cálculo de desperdicio** y estadísticas de ahorro
- **Notificaciones configurables** (email, push, SMS)
- **Múltiples ubicaciones de almacenamiento** con gestión de movimientos
- **Sistema de unidades flexible** (métrico/imperial)
- **Soporte para múltiples monedas**
- **Base de datos PostgreSQL** optimizada para consultas rápidas
- **Caché inteligente** para productos escaneados
- **Consultas optimizadas** para carga inicial en móvil
- **Almacenamiento híbrido** en dispositivos móviles
- **Dockerizado** para desarrollo local
- **APIs de respaldo** con sistema de fallback

## 📋 Requisitos

- Node.js 18+ 
- Docker y Docker Compose (recomendado)
- MongoDB, PostgreSQL y Redis (incluidos en Docker)
- npm o yarn

## 🛠️ Instalación

### Opción 1: Con Docker (Recomendado)

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd freshkeeper-backend
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
```

3. **Iniciar servicios con Docker**
```bash
docker-compose up -d
```

4. **Instalar dependencias**
```bash
npm install
```

5. **Iniciar el servidor**
```bash
npm run dev
```

### Opción 2: Instalación Manual

1. **Clonar e instalar**
```bash
git clone <repository-url>
cd freshkeeper-backend
npm install
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:
```env
NODE_ENV=development
PORT=3000

# Base de datos
DATABASE_URL=postgresql://freshkeeper:password@localhost:5432/freshkeeper
REDIS_URL=redis://localhost:6379

# Cache de productos
PRODUCT_CACHE_TTL=2592000

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here

# APIs externas
OPENFOODFACTS_API_URL=https://world.openfoodfacts.org/api/v0
CHOMP_API_KEY=your_chomp_api_key_here
CHOMP_API_URL=https://chompthis.com/api/v2

# Notificaciones (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

3. **Iniciar el servidor**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🌐 Endpoints de la API

### 🔐 Autenticación (`/api/auth`)
- `POST /register` - Registrar usuario ✅
- `POST /login` - Iniciar sesión ✅
- `POST /refresh` - Renovar token ✅
- `GET /profile` - Obtener perfil ✅
- `PUT /profile` - Actualizar perfil ✅
- `PUT /change-password` - Cambiar contraseña ✅
- `POST /logout` - Cerrar sesión ✅
- `DELETE /delete-account` - Eliminar cuenta ✅

### 📦 Productos (`/api/products`)
- `GET /scan/:barcode` - Escanear código de barras ✅
- `GET /search` - Buscar productos ✅
- `GET /popular` - Productos populares ✅
- `GET /:id` - Obtener producto específico ✅
- `POST /` - Crear producto manual ✅
- `PUT /:id` - Actualizar producto ✅
- `DELETE /:id` - Eliminar producto ✅
- `GET /test-apis` - Probar APIs externas ✅

### 📋 Inventario (`/api/inventory`)
- `GET /` - Obtener inventario del usuario ✅
- `POST /` - Agregar producto al inventario ✅
- `GET /expiring` - Productos próximos a expirar ✅
- `GET /stats` - Estadísticas del inventario ✅
- `PUT /:id` - Actualizar item del inventario ✅
- `DELETE /:id` - Eliminar item del inventario ✅
- `POST /:id/consume` - Marcar como consumido ✅

### 👥 Usuarios (`/api/users`) - En desarrollo
- `GET /` - Listar usuarios (admin) 🚧
- `GET /stats` - Estadísticas de usuarios 🚧
- `PUT /preferences` - Actualizar preferencias 🚧

### 🍳 Recetas (`/api/recipes`) - En desarrollo
- `GET /` - Obtener recetas del usuario 🚧
- `GET /suggestions` - Sugerencias basadas en inventario 🚧
- `POST /` - Crear nueva receta 🚧

**Leyenda:** ✅ Implementado | 🚧 En desarrollo

## 🔧 Estructura del Proyecto

```
src/
├── config/
│   └── database.ts          # Configuración PostgreSQL con Prisma/TypeORM
├── controllers/
│   ├── authController.ts    # Autenticación y gestión de usuarios
│   ├── productController.ts # Gestión de productos y escaneo
│   ├── inventoryController.ts # Gestión de listas e inventario
│   ├── userController.ts    # Gestión de usuarios (parcial)
│   ├── dashboardController.ts # Carga optimizada de datos iniciales
│   └── recipeController.ts  # Gestión de recetas (en desarrollo)
├── middleware/
│   ├── auth.ts             # Autenticación JWT
│   ├── validation.ts       # Validaciones con express-validator
│   └── rateLimiter.ts      # Rate limiting
├── models/
│   ├── User.ts             # Modelo de usuario con preferencias
│   ├── Product.ts          # Modelo de producto con múltiples fuentes
│   ├── UserItem.ts         # Modelo unificado de listas
│   ├── ItemMovement.ts     # Historial de movimientos
│   └── ProductCache.ts     # Caché de productos escaneados
├── routes/
│   ├── auth.ts             # Rutas de autenticación
│   ├── products.ts         # Rutas de productos
│   ├── inventory.ts        # Rutas de inventario y listas
│   ├── users.ts            # Rutas de usuarios
│   ├── dashboard.ts        # Rutas optimizadas para móvil
│   └── recipes.ts          # Rutas de recetas
├── services/
│   ├── ProductAPIService.ts # Integración con APIs externas
│   ├── DashboardService.ts  # Consultas optimizadas para login
│   └── CacheService.ts      # Gestión de caché de productos
├── types/
│   └── index.ts            # Definiciones de tipos TypeScript
└── app.ts                  # Configuración principal de Express
```

## 🌍 APIs Integradas

### OpenFoodFacts (Principal)
- **Gratuita** y de código abierto
- **1.9M+ productos** con códigos de barras
- **Información nutricional** completa
- **Soporte multiidioma**
- **Sin límites de rate**

### ChompAPI (Respaldo)
- API premium con alta precisión
- Base de datos global extensa
- Información nutricional detallada
- Requiere API key

### Base de datos local (Fallback)
- Productos creados manualmente
- Productos populares cacheados
- Búsqueda por nombre y categoría

## 🐳 Docker y Servicios

El proyecto incluye un `docker-compose.yml` completo con:

- **PostgreSQL** - Base de datos principal optimizada
- **Redis** - Cache y sesiones
- **Adminer** - Gestión de PostgreSQL
- **MongoDB** - Para migración gradual (temporal)
- **Mongo Express** - Interface web para MongoDB (temporal)

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar servicios
docker-compose down
```

**Puertos:**
- Backend: `3000`
- PostgreSQL: `5432`
- Redis: `6379`
- Adminer: `8080`
- MongoDB: `27017` (temporal)
- Mongo Express: `8081` (temporal)

## 🔒 Seguridad Implementada

- **Helmet.js** para headers de seguridad
- **Rate limiting** para prevenir abuso
- **Validación robusta** con express-validator
- **Autenticación JWT** con refresh tokens
- **Encriptación de contraseñas** con bcryptjs
- **CORS** configurado apropiadamente
- **Sanitización de datos** de entrada

## 📊 Modelos de Datos (PostgreSQL)

### Usuario (users)
- **Información básica**: email, nombre, contraseña encriptada
- **Preferencias**: idioma, zona horaria, moneda, unidades de medida
- **Perfil nutricional**: edad, peso, altura, objetivo calórico
- **Restricciones dietéticas**: alergias, intolerancias, dieta específica
- **Configuración de notificaciones**: email, push, SMS, frecuencia
- **Estadísticas de uso**: productos escaneados, desperdicio evitado

### Producto (products)
- **Origen del producto**: API (OpenFoodFacts, ChompAPI), manual, catálogo general
- **Información multiidioma**: nombres en diferentes idiomas
- **Datos nutricionales**: calorías, macronutrientes, micronutrientes
- **Ingredientes y alergenos**: lista completa con alertas
- **Información de almacenamiento**: temperatura, humedad, vida útil
- **Metadatos**: imágenes, popularidad, verificación de calidad
- **Caché inteligente**: datos de APIs con TTL optimizado

### Lista de Usuario (user_items)
- **Sistema unificado**: shopping, fridge, freezer, pantry en una tabla
- **Información del item**: cantidad, unidad, ubicación específica
- **Fechas importantes**: compra, expiración, apertura del producto
- **Gestión de alertas**: días antes de expirar, notificaciones enviadas
- **Estado del producto**: activo, consumido, expirado, descartado
- **Información de compra**: precio, moneda, tienda
- **Notas personales**: recordatorios, observaciones del usuario

### Movimientos de Items (item_movements)
- **Historial completo**: todos los cambios entre listas
- **Tipos de movimiento**: añadido, comprado, movido, consumido, descartado
- **Trazabilidad**: fecha, origen, destino, cantidad, razón
- **Análisis de patrones**: para recomendaciones futuras

### Caché de Productos (product_cache)
- **Datos de APIs**: respuesta completa de servicios externos
- **Optimización**: TTL de 30 días, limpieza automática
- **Procesamiento**: datos crudos vs procesados para la app
- **Estadísticas**: frecuencia de uso, última actualización

## ⚡ Optimizaciones de Rendimiento

### Consultas Optimizadas
- **Carga inicial unificada**: Una sola consulta para dashboard completo
- **Índices estratégicos**: Optimizados para consultas frecuentes
- **Paginación inteligente**: Carga progresiva de datos
- **Caché de productos**: TTL de 30 días para datos de APIs

### Estrategia de Carga Inicial
```sql
-- Consulta optimizada para dashboard del usuario
SELECT 
  u.id, u.name, u.email, u.preferences,
  ui.id as item_id, ui.list_type, ui.quantity, ui.expiration_date,
  p.name as product_name, p.nutritional_info, p.image_url
FROM users u
LEFT JOIN user_items ui ON u.id = ui.user_id AND ui.status = 'active'
LEFT JOIN products p ON ui.product_id = p.id
WHERE u.id = $1
ORDER BY 
  CASE ui.list_type 
    WHEN 'shopping' THEN 1 
    WHEN 'fridge' THEN 2 
    WHEN 'freezer' THEN 3 
    WHEN 'pantry' THEN 4 
  END,
  ui.expiration_date ASC NULLS LAST;
```

### Índices de Base de Datos
```sql
-- Índices para consultas frecuentes
CREATE INDEX idx_user_items_user_list ON user_items(user_id, list_type);
CREATE INDEX idx_user_items_expiration ON user_items(expiration_date) WHERE status = 'active';
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_product_cache_barcode_ttl ON product_cache(barcode, expires_at);
CREATE INDEX idx_item_movements_user_date ON item_movements(user_id, created_at DESC);
```

### Triggers Automáticos
```sql
-- Actualización automática de timestamps
CREATE TRIGGER update_user_items_updated_at
  BEFORE UPDATE ON user_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log automático de movimientos
CREATE TRIGGER log_item_movements
  AFTER UPDATE OF list_type ON user_items
  FOR EACH ROW EXECUTE FUNCTION log_item_movement();
```

## 📱 Estrategia de Almacenamiento Móvil

### Arquitectura Híbrida
- **SQLite local**: Datos estructurados (productos, listas, configuración)
- **SharedPreferences**: Configuración de usuario y preferencias
- **Caché de imágenes**: Almacenamiento local optimizado

### Sincronización Inteligente
- **Sincronización incremental**: Solo cambios desde última sync
- **Resolución de conflictos**: Timestamp-based con preferencia local
- **Modo offline**: Funcionalidad completa sin conexión
- **Sync en background**: Actualización automática cuando hay conexión

### Estrategia de Datos
```kotlin
// Ejemplo de estructura local Android
data class LocalUserItem(
    val id: String,
    val productId: String,
    val listType: ListType,
    val quantity: Double,
    val unit: String,
    val expirationDate: LocalDate?,
    val lastSyncTimestamp: Long,
    val isDirty: Boolean // Indica si necesita sincronización
)
```

### Optimizaciones Móviles
- **Carga progresiva**: Productos más recientes primero
- **Compresión de imágenes**: Múltiples resoluciones según contexto
- **Prefetch inteligente**: Productos frecuentes en caché local
- **Limpieza automática**: Eliminación de datos antiguos no utilizados

## 🔔 Sistema de Notificaciones Push

### ✅ Estado de Implementación
- **Backend**: ✅ **COMPLETAMENTE IMPLEMENTADO**
  - `NotificationService.ts` - Servicio completo de envío FCM
  - `NotificationScheduler.ts` - Programador automático con node-cron
  - Base de datos con tablas de tokens, historial y configuración
  - APIs para gestión de tokens y configuración de usuario

- **Frontend/Android**: 🚧 **PENDIENTE DE IMPLEMENTACIÓN**
  - Integración con Capacitor Push Notifications plugin
  - Registro automático de tokens FCM
  - Manejo de notificaciones recibidas

### Arquitectura de Notificaciones
El sistema de notificaciones utiliza **Firebase Cloud Messaging (FCM)** con:

- **Backend**: Firebase Admin SDK para envío de notificaciones
- **Android**: Firebase Cloud Messaging (FCM) para recepción
- **Base de datos**: Gestión de tokens, configuración y historial
- **Programación**: node-cron para tareas automáticas

### Servicios Implementados

#### NotificationService.ts ✅
```typescript
class NotificationService {
  // Envío de alertas de vencimiento
  async sendExpirationAlert(userId: string, productName: string, daysLeft: number)
  
  // Recordatorios de compras semanales
  async sendShoppingReminder(userId: string, itemCount: number)
  
  // Resúmenes semanales de inventario
  async sendWeeklySummary(userId: string, stats: WeeklyStats)
  
  // Gestión de tokens FCM
  async registerDeviceToken(userId: string, token: string, deviceInfo: DeviceInfo)
  async removeDeviceToken(userId: string, token: string)
  
  // Historial de notificaciones
  async getNotificationHistory(userId: string, limit?: number)
  async markNotificationAsRead(notificationId: string)
}
```

#### NotificationScheduler.ts ✅
```typescript
class NotificationScheduler {
  setupScheduledJobs() {
    // Verificar productos próximos a vencer (diario 9:00 AM)
    cron.schedule('0 9 * * *', () => this.checkExpiringProducts());
    
    // Recordatorio lista de compras (lunes 10:00 AM)  
    cron.schedule('0 10 * * 1', () => this.sendShoppingReminders());
    
    // Resumen semanal (domingos 8:00 PM)
    cron.schedule('0 20 * * 0', () => this.sendWeeklySummaries());
  }
}
```

#### APIs de Notificaciones ✅
```typescript
// Endpoints implementados en /api/notifications
POST   /register-token     // Registrar token FCM
DELETE /remove-token       // Eliminar token FCM
GET    /settings          // Obtener configuración de notificaciones
PUT    /settings          // Actualizar configuración
GET    /history           // Obtener historial de notificaciones
PATCH  /:id/read          // Marcar notificación como leída
POST   /test              // Enviar notificación de prueba
```

```sql
-- Tokens de dispositivos FCM
CREATE TABLE user_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token VARCHAR(255) NOT NULL UNIQUE,
  device_id VARCHAR(255),
  platform VARCHAR(20) DEFAULT 'android',
  app_version VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de notificaciones enviadas
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'expiration_alert', 'shopping_reminder', etc.
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivery_status VARCHAR(20) DEFAULT 'sent',
  opened_at TIMESTAMP
);

-- Configuración personalizada de notificaciones
CREATE TABLE user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expiration_alerts BOOLEAN DEFAULT true,
  expiration_days_before INTEGER DEFAULT 2,
  shopping_reminders BOOLEAN DEFAULT true,
  shopping_reminder_time TIME DEFAULT '10:00:00',
  weekly_summary BOOLEAN DEFAULT true,
  weekly_summary_day INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Backend - Servicio de Notificaciones

```typescript
// src/services/NotificationService.ts
import admin from 'firebase-admin';

class NotificationService {
  constructor() {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }

  async sendExpirationAlert(userId: string, productName: string, daysLeft: number) {
    const tokens = await UserDeviceToken.findByUserId(userId);
    
    const message = {
      notification: {
        title: '⚠️ Producto próximo a vencer',
        body: `${productName} vence en ${daysLeft} día(s)`,
      },
      data: {
        type: 'expiration_alert',
        productName,
        daysLeft: daysLeft.toString(),
      },
      tokens: tokens.map(t => t.fcm_token),
    };

    return await admin.messaging().sendMulticast(message);
  }
}
```

### Sistema de Programación Automática

```typescript
// src/services/NotificationScheduler.ts
import cron from 'node-cron';

class NotificationScheduler {
  setupScheduledJobs() {
    // Verificar productos próximos a vencer (diario 9:00 AM)
    cron.schedule('0 9 * * *', async () => {
      await this.checkExpiringProducts();
    });

    // Recordatorio lista de compras (lunes 10:00 AM)
    cron.schedule('0 10 * * 1', async () => {
      await this.sendShoppingReminders();
    });
  }

  private async checkExpiringProducts() {
    const expiringItems = await UserItem.findExpiringItems(2);
    
    for (const item of expiringItems) {
      const daysLeft = Math.ceil(
        (item.expiration_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      await this.notificationService.sendExpirationAlert(
        item.user_id,
        item.product.name,
        daysLeft
      );
    }
  }
}
```

### Android - Configuración FCM

```kotlin
// MainActivity.kt
import com.google.firebase.messaging.FirebaseMessaging

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                val token = task.result
                sendTokenToServer(token)
            }
        }
    }
}

// MyFirebaseMessagingService.kt
class MyFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        
        remoteMessage.notification?.let {
            showNotification(it.title, it.body, remoteMessage.data)
        }
    }
    
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        sendTokenToServer(token)
    }
}
```

### Frontend - Integración con Capacitor

```typescript
// src/services/PushNotificationService.ts
import { PushNotifications } from '@capacitor/push-notifications';

class PushNotificationService {
  async initializePushNotifications() {
    const permission = await PushNotifications.requestPermissions();
    
    if (permission.receive === 'granted') {
      await PushNotifications.register();
    }

    PushNotifications.addListener('registration', async (token) => {
      await this.registerTokenWithBackend(token.value);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      this.handleNotificationAction(notification.notification.data);
    });
  }

  private handleNotificationAction(data: any) {
    switch (data.type) {
      case 'expiration_alert':
        // Navegar a productos próximos a vencer
        break;
      case 'shopping_reminder':
        // Navegar a lista de compras
        break;
    }
  }
}
```

### Endpoints de API

```typescript
// src/routes/notifications.ts
router.post('/register-token', authMiddleware, NotificationController.registerToken);
router.put('/settings', authMiddleware, NotificationController.updateSettings);
router.get('/history', authMiddleware, NotificationController.getHistory);
router.patch('/:id/read', authMiddleware, NotificationController.markAsRead);
```

### Variables de Entorno Adicionales

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Tipos de Notificaciones

- **🚨 Alertas de expiración**: Productos próximos a vencer
- **🛒 Recordatorios de compras**: Lista de compras pendiente
- **📊 Resumen semanal**: Estadísticas de desperdicio y consumo
- **🎯 Recomendaciones**: Productos sugeridos basados en patrones
- **✅ Confirmaciones**: Compras realizadas, productos consumidos

### Flujo de Notificaciones

1. **Registro**: App Android obtiene token FCM → Envía al backend
2. **Programación**: Backend programa tareas automáticas (cron jobs)
3. **Detección**: Sistema detecta eventos (productos por vencer)
4. **Envío**: Backend envía notificación via Firebase Admin SDK
5. **Recepción**: Android recibe y muestra notificación
6. **Acción**: Usuario toca notificación → App navega a pantalla relevante

## 🚀 Despliegue

### Railway + PostgreSQL (Recomendado)
El proyecto está optimizado para despliegue en **Railway** con base de datos **PostgreSQL**:

```bash
# Variables de entorno para Railway
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key
OPENFOODFACTS_API_URL=https://world.openfoodfacts.org/api/v0
CHOMP_API_KEY=your-chomp-api-key
CHOMP_API_URL=https://chompthis.com/api/v2
PRODUCT_CACHE_TTL=2592000  # 30 días en segundos
NODE_ENV=production
PORT=3000
```

### Configuración de Railway
1. **Conectar repositorio** desde GitHub
2. **Añadir PostgreSQL** como servicio vinculado
3. **Configurar variables** de entorno desde el dashboard
4. **Deploy automático** en cada push a main

### Migración desde MongoDB
```bash
# Script de migración (desarrollo futuro)
npm run migrate:mongo-to-postgres
```

### Monitoreo y Logs
- **Logs centralizados** en Railway dashboard
- **Métricas de rendimiento** automáticas
- **Alertas de error** configurables
- **Backup automático** de PostgreSQL

### Escalabilidad
- **Auto-scaling** basado en CPU/memoria
- **Connection pooling** para PostgreSQL
- **CDN** para imágenes de productos
- **Rate limiting** para APIs externas

### Otras plataformas
- Vercel (con PostgreSQL externa)
- Render
- Heroku
- DigitalOcean App Platform

## 🧪 Testing y Desarrollo

```bash
# Desarrollo con hot reload
npm run dev

# Build para producción
npm run build

# Iniciar en producción
npm start

# Linting (cuando esté configurado)
npm run lint

# Tests (pendiente de implementar)
npm test
```

## 📈 Estado del Proyecto

### ✅ Completado
- Sistema de autenticación completo
- Gestión de productos con APIs externas
- Inventario con alertas y estadísticas
- **Sistema de notificaciones backend completo**
  - NotificationService.ts con Firebase FCM
  - NotificationScheduler.ts con cron jobs automáticos
  - Base de datos con tokens, historial y configuración
  - APIs REST para gestión de notificaciones
- Modelos de base de datos robustos
- Dockerización completa
- Middleware de seguridad

### 🚧 En Desarrollo
- Sistema de recetas
- Funcionalidades de administrador
- **Notificaciones push frontend** (Capacitor + Android)
- Suite de tests automatizados

### 📋 Pendiente
- Migración a PostgreSQL
- Sistema de recomendaciones ML
- API de análisis nutricional
- Integración con dispositivos IoT

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para soporte y preguntas:
- Crear un [Issue](../../issues)
- Contactar al equipo de desarrollo

## 🔄 Changelog

### v2.0.0 (En Desarrollo) - Rediseño PostgreSQL
- 🔄 **MIGRACIÓN COMPLETA A POSTGRESQL**: Transición desde MongoDB
- 🆕 **Nuevo diseño de base de datos**: Sistema unificado y optimizado
- 🆕 **Sistema de listas inteligente**: Shopping, fridge, freezer, pantry en una tabla
- 🆕 **Caché optimizado**: Sistema de caché para productos escaneados (TTL 30 días)
- 🆕 **Consultas optimizadas**: Carga inicial unificada para móvil
- 🆕 **Sistema de notificaciones push**: Firebase FCM completo
- 🆕 **Historial de movimientos**: Trazabilidad completa de productos
- 🆕 **Configuración personalizada**: Notificaciones y preferencias granulares
- 🆕 **Almacenamiento híbrido móvil**: SQLite + SharedPreferences
- 🆕 **Sincronización inteligente**: Resolución de conflictos automática
- ⚡ **Índices optimizados**: Rendimiento mejorado para consultas frecuentes
- ⚡ **Triggers automáticos**: Actualización de timestamps y logging
- 🚀 **Despliegue Railway**: Configuración optimizada para Railway + PostgreSQL

#### Nuevas Tablas PostgreSQL:
- `users` - Información completa del usuario
- `products` - Productos unificados (API/manual/catálogo)
- `user_items` - Lista unificada con enum de tipos
- `item_movements` - Historial completo de movimientos
- `product_cache` - Caché inteligente de APIs
- `user_device_tokens` - Tokens FCM para notificaciones
- `notification_history` - Historial de notificaciones enviadas
- `user_notification_settings` - Configuración personalizada

#### Optimizaciones de Rendimiento:
- Consulta SQL unificada para dashboard
- Índices estratégicos para consultas frecuentes
- Sistema de caché con TTL automático
- Carga progresiva para móvil
- Connection pooling para PostgreSQL

### v1.0.0 (Actual) - Base MongoDB
- ✅ Sistema de autenticación JWT completo
- ✅ Integración OpenFoodFacts y ChompAPI
- ✅ Gestión completa de inventario
- ✅ Soporte multiidioma y preferencias
- ✅ Dockerización completa
- ✅ Modelos de datos robustos
- 🚧 Sistema de recetas (en desarrollo)
- 🚧 Panel de administración (en desarrollo)
- 🚧 **OAuth Social Login** (pendiente):
  - Google Sign-In integration
  - Apple Sign-In integration
  - Endpoints: `/api/auth/google`, `/api/auth/apple`
