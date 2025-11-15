# 🚂 Guía Completa de Deployment en Railway

## 📋 Pasos para Deploy Completo

### **🔧 1. Variables de Entorno en Railway**

En tu proyecto Railway, agregar estas variables:

#### **Firebase (Notificaciones):**
```bash
FIREBASE_PROJECT_ID=eatwise-notifications
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@eatwise-notifications.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
[CLAVE_COMPLETA_AQUI]
-----END PRIVATE KEY-----
```

#### **Base de Datos:**
Railway automáticamente provee:
```bash
DATABASE_URL=postgresql://...
```

### **🗄️ 2. Base de Datos - Migraciones y Seed**

#### **Migraciones (Automático):**
Railway ejecutará automáticamente:
```bash
npx prisma migrate deploy
```

#### **Seed (Manual después del deploy):**
```bash
# Opción 1: Desde Railway CLI
railway run npm run seed:prod

# Opción 2: Desde Railway Dashboard
# Variables → Add Variable → RAILWAY_RUN_SEED=true
# Luego redeploy
```

### **🌱 3. Ejecutar Seed en Railway**

#### **Método 1: Railway CLI (Recomendado)**
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Conectar al proyecto
railway link

# Ejecutar seed
railway run npm run seed:prod
```

#### **Método 2: Desde Dashboard**
1. Ve a tu proyecto en Railway
2. Click en "Deployments"
3. Click en el deployment activo
4. Click en "View Logs"
5. En otra pestaña, agrega variable temporal:
   - `RAILWAY_RUN_SEED=true`
6. Redeploy el servicio
7. Remover la variable después

#### **Método 3: Endpoint de Seed (Desarrollo)**
Agregar endpoint temporal para ejecutar seed:

```typescript
// En index.ts o routes/admin.ts
app.post('/admin/seed', async (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    return res.status(403).json({ error: 'Only in development' });
  }
  
  try {
    // Ejecutar seed logic aquí
    res.json({ success: true, message: 'Seed completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **🔍 4. Verificar Deployment**

#### **Logs a buscar:**
```bash
✅ Database connected
🔥 Firebase Admin SDK initialized with environment variables
🔔 Notification routes loaded
📅 Notification scheduler initialized
🌱 Database seed completed (si ejecutaste seed)
🚀 FreshKeeper API ejecutándose en puerto XXXX
```

#### **Endpoints a probar:**
```bash
# Health check
GET https://tu-app.railway.app/health

# Test Firebase
POST https://tu-app.railway.app/api/notifications/test-firebase

# Productos (después del seed)
GET https://tu-app.railway.app/api/products
```

### **📊 5. Verificar Datos**

#### **Comprobar que el seed funcionó:**
```bash
# Desde Railway CLI
railway connect

# En la consola PostgreSQL:
SELECT COUNT(*) FROM "Product";
SELECT COUNT(*) FROM "Category";
SELECT name FROM "Product" LIMIT 5;
```

### **🔄 6. Proceso Completo de Deploy**

```bash
# 1. Push código a GitHub
git push origin main

# 2. Railway auto-deploya

# 3. Verificar variables de entorno en Railway Dashboard

# 4. Ejecutar seed
railway run npm run seed:prod

# 5. Verificar endpoints
curl https://tu-app.railway.app/health
curl https://tu-app.railway.app/api/products

# 6. Probar notificaciones
curl -X POST https://tu-app.railway.app/api/notifications/test-firebase
```

### **⚠️ Troubleshooting**

#### **Si Firebase falla:**
- Verificar que las 3 variables estén configuradas
- Verificar que `FIREBASE_PRIVATE_KEY` incluya BEGIN/END
- Revisar logs: `railway logs`

#### **Si el seed falla:**
- Verificar que `DATABASE_URL` esté configurada
- Verificar que las migraciones se ejecutaron
- Ejecutar seed manualmente: `railway run npm run seed:prod`

#### **Si faltan productos:**
```bash
# Verificar conexión a DB
railway connect

# Verificar tablas
\dt

# Verificar datos
SELECT COUNT(*) FROM "Product";
```

### **🎯 Resultado Final**

Después del deployment completo deberías tener:

✅ **API funcionando** en Railway  
✅ **Base de datos** con migraciones aplicadas  
✅ **Productos y categorías** cargados via seed  
✅ **Firebase** configurado para notificaciones  
✅ **Cron jobs** ejecutándose automáticamente  
✅ **Sistema completo** operativo en producción  

**🚀 ¡Tu app estará 100% funcional en Railway!**
