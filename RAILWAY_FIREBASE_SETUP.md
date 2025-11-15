# 🚂 Configuración Firebase para Railway

## 📋 Variables de Entorno para Railway

### **🔧 Configurar en Railway Dashboard:**

1. **Ve a tu proyecto en Railway**
2. **Click en "Variables"**
3. **Agrega estas 3 variables:**

```bash
FIREBASE_PROJECT_ID=eatwise-notifications
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@eatwise-notifications.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
[PEGAR_AQUI_LA_CLAVE_PRIVADA_COMPLETA_DE_FIREBASE]
-----END PRIVATE KEY-----
```

### **⚠️ IMPORTANTE para FIREBASE_PRIVATE_KEY:**

**En Railway, pega la clave privada COMPLETA incluyendo:**
- `-----BEGIN PRIVATE KEY-----`
- Todo el contenido de la clave (obtenido del archivo JSON de Firebase)
- `-----END PRIVATE KEY-----`

**Railway automáticamente manejará los saltos de línea.**

---

## 🔍 Obtener las Credenciales

### **Desde Firebase Console:**
1. Ve a Firebase Console → Configuración del proyecto
2. Pestaña "Cuentas de servicio"
3. Click "Generar nueva clave privada"
4. Descargar archivo JSON
5. Copiar los valores del JSON a las variables de Railway

---

## 🧪 Verificación

### **Logs a buscar después del deploy:**
```
🔥 Firebase Admin SDK initialized with environment variables
```

### **Si ves este error:**
```
❌ Failed to initialize Firebase Admin SDK
```

**Verifica que:**
1. Las 3 variables estén configuradas en Railway
2. `FIREBASE_PRIVATE_KEY` incluya `-----BEGIN` y `-----END`
3. No haya espacios extra al copiar/pegar

---

## 🔄 Desarrollo Local vs Railway

### **Railway (Producción):**
- ✅ Usa variables de entorno
- ✅ Seguro (no expone credenciales en código)
- ✅ Fácil de configurar

### **Local (Desarrollo):**
- ✅ Usa archivo JSON como fallback
- ✅ Archivo en `.gitignore` (no se sube a Git)
- ✅ Fácil para desarrollo

---

## 🚀 Pasos para Railway

1. **Deploy el código actual** (ya tiene soporte para variables de entorno)
2. **Agregar las 3 variables** en Railway Dashboard
3. **Restart el servicio** en Railway
4. **Verificar logs** que diga "environment variables"

**¡Listo! No necesitas subir archivos manualmente a Railway.** 🎉
