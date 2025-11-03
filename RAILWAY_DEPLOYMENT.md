# 🚀 Guía de Despliegue en Railway

Esta guía te ayudará a desplegar FreshKeeper Backend y su base de datos PostgreSQL en Railway.

## 📋 Prerrequisitos

1. **Cuenta en Railway**: [railway.app](https://railway.app)
2. **Repositorio Git**: Tu código debe estar en GitHub/GitLab
3. **Variables de entorno**: Configuradas correctamente

## 🗄️ Paso 1: Desplegar PostgreSQL

### 1.1 Crear Base de Datos
```bash
# En Railway Dashboard
1. New Project → Add PostgreSQL
2. Nombre: "freshkeeper-db"
3. Railway generará automáticamente:
   - DATABASE_URL
   - POSTGRES_DB
   - POSTGRES_USER  
   - POSTGRES_PASSWORD
```

### 1.2 Configurar Conexión
```bash
# Railway te dará una URL como:
postgresql://postgres:password@host:port/railway

# Copia esta URL para el backend
```

## 🚀 Paso 2: Desplegar Backend

### 2.1 Conectar Repositorio
```bash
# En Railway Dashboard
1. New Project → Deploy from GitHub
2. Selecciona: freshkeeper-backend/
3. Railway detectará automáticamente Node.js
```

### 2.2 Configurar Variables de Entorno

En Railway Dashboard → Variables:

```bash
# Base de datos (usar la URL de Railway)
DATABASE_URL=postgresql://postgres:password@host:port/railway

# Aplicación
NODE_ENV=production
PORT=3000

# JWT (generar claves seguras)
JWT_SECRET=tu_clave_super_secreta_para_produccion
JWT_REFRESH_SECRET=tu_clave_refresh_super_secreta

# APIs externas
OPEN_FOOD_FACTS_API_URL=https://world.openfoodfacts.org/api/v0
CHOMP_API_KEY=tu_clave_chomp_api
FATSECRET_CLIENT_ID=tu_client_id
FATSECRET_CLIENT_SECRET=tu_client_secret

# Cache (opcional - Railway Redis)
REDIS_URL=redis://default:password@host:port
PRODUCT_CACHE_TTL=2592000
```

### 2.3 Configurar Build Commands

En Railway → Settings → Build & Deploy:

```bash
# Build Command
npm install && npx prisma generate && npm run build

# Start Command  
npm start
```

## 📦 Paso 3: Configurar package.json

Asegúrate de tener estos scripts en tu `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "nodemon --exec ts-node index.ts",
    "db:push": "npx prisma db push",
    "db:generate": "npx prisma generate"
  }
}
```

## 🔧 Paso 4: Migrar Base de Datos

### 4.1 Ejecutar Migraciones
```bash
# Desde tu terminal local
export DATABASE_URL="postgresql://postgres:password@host:port/railway"
npx prisma db push
```

### 4.2 Verificar Esquema
```bash
# Conectar a Railway DB
npx prisma studio
# O usar Railway CLI
railway connect postgresql
```

## 🌐 Paso 5: Configurar Dominio (Opcional)

### 5.1 Dominio Railway
```bash
# Railway te da un dominio automático:
https://freshkeeper-backend-production.up.railway.app
```

### 5.2 Dominio Personalizado
```bash
# En Railway → Settings → Domains
1. Add Custom Domain
2. Configura DNS: CNAME → railway-domain
3. Railway maneja SSL automáticamente
```

## 🔒 Paso 6: Configurar CORS para Producción

Actualiza tu `index.ts`:

```typescript
// CORS para producción
app.use(cors({
  origin: [
    'https://tu-frontend-domain.com',
    'https://freshkeeper-app.vercel.app',
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'http://localhost:5173'
  ],
  credentials: true
}));
```

## 📱 Paso 7: Actualizar Frontend

Actualiza las URLs del backend en tu frontend:

```typescript
// src/constants/api.ts
export const API_BASE_URL = 'https://freshkeeper-backend-production.up.railway.app';
```

## 🔍 Paso 8: Verificar Despliegue

### 8.1 Health Check
```bash
curl https://tu-backend-url.railway.app/health
```

### 8.2 Test de Registro
```bash
curl -X POST https://tu-backend-url.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@railway.com", 
    "password": "password123"
  }'
```

## 🚨 Troubleshooting

### Error: "Cannot connect to database"
```bash
# Verifica DATABASE_URL
echo $DATABASE_URL

# Verifica conectividad
npx prisma db push
```

### Error: "Module not found"
```bash
# Asegúrate de que build funcione
npm run build
ls dist/  # Debe existir
```

### Error: "Port already in use"
```bash
# Railway asigna PORT automáticamente
# Usa: process.env.PORT || 3000
```

## 💰 Costos Estimados

### Railway Pricing (2024):
- **PostgreSQL**: $5/mes (512MB RAM, 1GB storage)
- **Backend App**: $5/mes (512MB RAM, 1GB storage)
- **Total**: ~$10/mes

### Alternativas Gratuitas:
- **Supabase**: PostgreSQL gratuito (500MB)
- **Vercel**: Backend gratuito (con limitaciones)
- **PlanetScale**: MySQL gratuito (5GB)

## 🔄 CI/CD Automático

Railway despliega automáticamente cuando haces push a `main`:

```bash
git add .
git commit -m "Deploy to production"
git push origin main
# Railway despliega automáticamente
```

## 📊 Monitoreo

### Railway Dashboard:
- **Logs**: Ver logs en tiempo real
- **Metrics**: CPU, RAM, requests
- **Deployments**: Historial de despliegues

### Health Checks:
```bash
# Configurar en Railway
curl https://tu-backend-url.railway.app/health
```

## 🔐 Seguridad en Producción

1. **Variables de entorno**: Nunca hardcodear secrets
2. **HTTPS**: Railway lo maneja automáticamente  
3. **Rate Limiting**: Ya implementado en tu código
4. **CORS**: Configurar dominios específicos
5. **JWT**: Usar claves seguras (256-bit)

## 🚨 Solución de Problemas Comunes

### Error: "Cannot find module '../../generated/prisma'"

**Problema**: El cliente de Prisma no se genera durante el build.

**Solución**: 
1. Actualizar `package.json`:
```json
{
  "scripts": {
    "build": "prisma generate && tsc",
    "postinstall": "prisma generate",
    "deploy": "prisma migrate deploy && npm run start"
  }
}
```

2. Crear `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run deploy",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Error: "P1001 - Can't reach database server"

**Problema**: Usando URL interna desde local o URL pública desde Railway.

**Solución**:
- **Local**: Usar URL pública (`centerbeam.proxy.rlwy.net:55367`)
- **Railway**: Usar URL interna (`postgres.railway.internal:5432`)

### Build lento o falla

**Problema**: Dependencias o migraciones fallan.

**Solución**:
```bash
# Limpiar caché
railway run --service backend npm ci
railway run --service backend npx prisma generate
railway run --service backend npx prisma migrate deploy
```

## 📞 Soporte

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: Comunidad activa
- **Prisma Docs**: [prisma.io/docs](https://prisma.io/docs)

---

¡Tu aplicación estará lista para producción en Railway! 🎉