# FreshKeeper - Guía para Desarrolladores

## 🚀 Configuración Inicial

### Prerrequisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd freshkeeper-backend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones:
```env
# Base de datos
DATABASE_URL="postgresql://username:password@localhost:5432/freshkeeper"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Servidor
PORT=3001
NODE_ENV=development

# Notificaciones Push (opcional)
FIREBASE_PROJECT_ID="your-firebase-project"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"

# APIs externas (opcional)
OPENFOODFACTS_API_URL="https://world.openfoodfacts.org/api/v0"
SPOONACULAR_API_KEY="your-spoonacular-api-key"
```

4. **Configurar la base de datos**
```bash
# Aplicar el esquema de Prisma
npm run db:push

# Poblar con datos iniciales
npm run db:setup
```

5. **Iniciar el servidor de desarrollo**
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3001`

## 🏗️ Arquitectura del Proyecto

```
src/
├── config/          # Configuraciones (DB, JWT, etc.)
├── controllers/     # Controladores de rutas
├── middleware/      # Middleware personalizado
├── models/          # Modelos de datos (Prisma)
├── routes/          # Definición de rutas
├── services/        # Lógica de negocio
├── types/           # Tipos TypeScript
└── utils/           # Utilidades y helpers
```

### Tecnologías Utilizadas

- **Framework**: Express.js
- **Base de datos**: PostgreSQL + Prisma ORM
- **Autenticación**: JWT
- **Validación**: Joi
- **Notificaciones**: Firebase Cloud Messaging
- **Lenguaje**: TypeScript

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor con hot-reload
npm run build        # Compila TypeScript
npm run start        # Inicia servidor de producción

# Base de datos
npm run db:generate  # Genera cliente Prisma
npm run db:push      # Aplica cambios al esquema
npm run db:setup     # Pobla la base de datos
npm run db:reset     # Resetea la base de datos

# Utilidades
npm run lint         # Ejecuta ESLint
npm run test         # Ejecuta tests
```

## 📊 Modelo de Datos

### Usuario (User)
```typescript
{
  id: string
  name: string
  email: string
  passwordHash: string
  isAdmin: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Producto (Product)
```typescript
{
  id: string
  barcode: string
  name: string
  brand?: string
  category?: string
  nutritionalInfo?: NutritionalInfo
  imageUrl?: string
  allergens: string[]
  ingredients?: string
  source: ProductSource
  isVerified: boolean
}
```

### Item de Usuario (UserItem)
```typescript
{
  id: string
  userId: string
  productId: string
  listType: ListType // 'fridge' | 'pantry' | 'freezer' | 'shopping'
  quantity: number
  unit: string
  purchaseDate?: Date
  expiryDate?: Date
  notes?: string
}
```

## 🔐 Autenticación y Autorización

### Middleware de Autenticación

```typescript
// Proteger rutas
app.use('/protected-route', authenticateToken);

// Verificar rol de administrador
app.use('/admin-route', authenticateToken, requireAdmin);
```

### Generar Token JWT

```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET!,
  { expiresIn: process.env.JWT_EXPIRES_IN }
);
```

## 📱 Notificaciones Push

### Configuración Firebase

1. Crear proyecto en Firebase Console
2. Generar clave privada del service account
3. Configurar variables de entorno

### Enviar Notificación

```typescript
import { NotificationService } from '../services/NotificationService';

const notificationService = new NotificationService();

await notificationService.sendExpiryReminder(userId, expiringItems);
```

## 🧪 Testing

### Estructura de Tests

```
tests/
├── unit/           # Tests unitarios
├── integration/    # Tests de integración
└── fixtures/       # Datos de prueba
```

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests específicos
npm test -- --grep "auth"

# Con coverage
npm run test:coverage
```

## 🚀 Despliegue

### Variables de Entorno de Producción

```env
NODE_ENV=production
DATABASE_URL="postgresql://prod-user:password@prod-host:5432/freshkeeper"
JWT_SECRET="super-secure-production-secret"
```

### Docker

```bash
# Construir imagen
docker build -t freshkeeper-backend .

# Ejecutar contenedor
docker run -p 3001:3001 --env-file .env freshkeeper-backend
```

### Vercel

El proyecto incluye configuración para Vercel (`vercel.json`):

```bash
# Desplegar
vercel --prod
```

## 🔍 Debugging

### Logs

```typescript
import { logger } from '../utils/logger';

logger.info('Información general');
logger.error('Error crítico', { error });
logger.debug('Información de debug');
```

### Variables de Debug

```bash
# Activar logs de debug
DEBUG=freshkeeper:* npm run dev

# Solo logs de base de datos
DEBUG=freshkeeper:db npm run dev
```

## 📈 Monitoreo y Performance

### Health Check

```bash
curl http://localhost:3001/health
```

### Métricas

- Tiempo de respuesta de endpoints
- Uso de memoria
- Conexiones de base de datos
- Errores por minuto

## 🛠️ Desarrollo de Nuevas Funcionalidades

### 1. Crear Nueva Ruta

```typescript
// src/routes/newFeature.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  // Lógica del endpoint
});

export default router;
```

### 2. Registrar Ruta

```typescript
// index.ts
import newFeatureRoutes from './src/routes/newFeature';
app.use('/new-feature', newFeatureRoutes);
```

### 3. Crear Servicio

```typescript
// src/services/NewFeatureService.ts
export class NewFeatureService {
  async processData(data: any) {
    // Lógica de negocio
  }
}
```

### 4. Agregar Validación

```typescript
import Joi from 'joi';

const schema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required()
});

const { error, value } = schema.validate(req.body);
```

## 🐛 Solución de Problemas Comunes

### Error de Conexión a Base de Datos

```bash
# Verificar que PostgreSQL esté ejecutándose
pg_isready -h localhost -p 5432

# Verificar conexión
npm run db:generate
```

### Error de JWT

```bash
# Verificar que JWT_SECRET esté configurado
echo $JWT_SECRET

# Regenerar token
curl -X POST http://localhost:3001/auth/login \
  -d '{"email":"test@example.com","password":"password"}'
```

### Error de Prisma

```bash
# Regenerar cliente
npm run db:generate

# Resetear base de datos
npm run db:reset
```

## 📚 Recursos Adicionales

- [Documentación de Prisma](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [JWT.io](https://jwt.io/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.