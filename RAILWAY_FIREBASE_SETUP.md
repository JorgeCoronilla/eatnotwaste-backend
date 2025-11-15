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
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDHfPG615wNrLa7
BFz+C907CoYYGG2nhbCKfwOealyLcs5s2XGQDJDPC6RvThJHK1XaWTqncj7iyQyQ
bQ3ywH9mcdPRo1F9R48esu3Crx81io/6PyZ1ho65EBnQy0PKOK7FmDv9ajU5sR00
NnuaHixXH5TcB+HIwY3T1TjN2HE36jLMDhNeZLIJyuob0kK2MrizLH9eNNZGnMoB
eQvoWKp/Tj5KkKw2ZxUDJhYeGgVz1+KT9xom4Dok6badkiDqV+Gpq48HN/xwfXTh
zBPHfkksybW83qCweiGcuVmC98brakcfBbJe7173xup0+6R97Dx52aPn2wUff0XV
5tXOD8tnAgMBAAECggEAUhFvWygPfbqztC2f2i3kVkFGmEwYdIY18kw9n2LvbrkM
/k/YfeQFgQAvplDOiTPlTn5N+IwyHdeLUTFkPx19bBZhB4oyYKFbWkxPLzwfUUYP
ZGqtdkUkmzLqA/FTkrKOCCFQcLlMa08Xjh7p66YFJNSLx5eAhjhGkkLSazDjpxX6
liy+swKbXmhSMPA8zOiz029xkGtROM4AueizMAu94DDPJjQjXakrz74t5qpLoVgl
TP5BqHiCPKLFsNl8iCy5NUau5T6U8GfTX5Cw3WHDZMex+0qzD/WFChjNaUhDGjzC
cWKiaQFLqC7LFQTv8XuTxGLgjA6l/O5zJ6v4s9GdRQKBgQDuxQxjbxb/oxDikPzX
DRS17wjzuTZaDnp0ABaVGkSu+aQT9pLSpLBaKftdzh3A4V+/Ap7hiisimBQhaObb
Ei47OUdsbPkmp8CoC0/JhX7vsiWxhnQQ4QT0cWN6IGybVOh0X/S7bkgbLtpL008c
O6QQNF4HFyGR4TmRoRQuDu3s4wKBgQDV4jhAZ2JV4H0wbh8UpZg0ahEHu0LTBYc9
P3uWROd3QdNmJFB6yXy4Zj+sksWDE5gd5d0u5/QvNxDRtPRfEjVEt14SKtX5n4p0
dFgoTYwEASV0cGfGvz+6nsg7BUSE11OBOvAE0gjkG8YIvETyWi95WPv4vLxMWdPR
4Is66+JSrQKBgEEaDwepiX7IKllsKNRF58i3VRyG+m/RlMe+ImojEGkY/gjHaT7v
0nmzCquIAIrPqHh/MWzTbHFxP8PgQ1ml+l8BfhztFX3ZrWjkNKwArxyR2T8vJsRX
Zi90Hyh0YMh1fTAF3cehCR4IR1L3WZGcHV6huKV8RBXvb+/qGIN6ZJr7AoGBAKSh
TSUdrs5lTldR3DCbSe3GWrd1x3kAf1mAnNNM1FGyZFLxztTEdHDHm2ltTASZt3QD
891gA0+4dgTE4XiwXjo3XnxjZnKPABalWxoinoySiU74GpkbqqUuBPeRFW2fBJKr
WAaN2PQkAKnGqNdW3cXs3X5XYCTw259n1COVX469AoGAUTPkIWJxzylGflKtlLyr
+7VaMHrk4nQoMW2pgpvZ3A/PQQlFSZbL8YQpvV5e3jpuO0E4LWPK0ifYVZqiNCkE
hthJYvSSxfQ30U5Fb8BaVGIDJMaC9CoGdi8Zb4c/fxsJvK5wspwW1nnFNIeO2iKe
KdsWOhNeGe8hPSeTMC/qNHc=
-----END PRIVATE KEY-----
```

### **⚠️ IMPORTANTE para FIREBASE_PRIVATE_KEY:**

**En Railway, pega la clave privada COMPLETA incluyendo:**
- `-----BEGIN PRIVATE KEY-----`
- Todo el contenido de la clave
- `-----END PRIVATE KEY-----`

**Railway automáticamente manejará los saltos de línea.**

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
