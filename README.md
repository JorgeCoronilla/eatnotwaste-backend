# FreshKeeper Backend

Backend API para FreshKeeper - Aplicación de gestión de inventario de alimentos con soporte para códigos de barras y múltiples idiomas.

## 🚀 Características

- **Escaneo de códigos de barras** con integración a Open Food Facts
- **Gestión de inventario personal** con fechas de expiración
- **Autenticación JWT** segura
- **Soporte multiidioma** (ES, EN, FR, PT)
- **APIs de respaldo** (FatSecret, Spoonacular)
- **Optimizado para Vercel** deployment
- **Base de datos MongoDB**

## 📋 Requisitos

- Node.js 18+ 
- MongoDB (local o Atlas)
- npm o yarn

## 🛠️ Instalación

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

Editar `.env` con tus configuraciones:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/freshkeeper
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here
```

4. **Iniciar el servidor**
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🌐 Endpoints Principales

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/profile` - Actualizar perfil

### Productos
- `GET /api/products/scan/:barcode` - Escanear código de barras
- `GET /api/products/search?q=query` - Buscar productos
- `GET /api/products/popular` - Productos populares
- `POST /api/products` - Crear producto manual

### Inventario
- `GET /api/inventory` - Obtener inventario
- `POST /api/inventory` - Agregar al inventario
- `GET /api/inventory/expiring` - Productos próximos a expirar
- `POST /api/inventory/:id/consume` - Consumir producto

## 🔧 Estructura del Proyecto

```
src/
├── config/
│   └── database.js          # Configuración MongoDB
├── controllers/
│   ├── authController.js    # Controlador de autenticación
│   ├── productController.js # Controlador de productos
│   └── inventoryController.js # Controlador de inventario
├── middleware/
│   ├── auth.js             # Middleware de autenticación
│   └── validation.js       # Validaciones
├── models/
│   ├── User.js             # Modelo de usuario
│   ├── Product.js          # Modelo de producto
│   └── Inventory.js        # Modelo de inventario
├── routes/
│   ├── auth.js             # Rutas de autenticación
│   ├── products.js         # Rutas de productos
│   └── inventory.js        # Rutas de inventario
└── services/
    └── ProductAPIService.js # Servicio de APIs externas
```

## 🌍 APIs Integradas

### Open Food Facts (Principal)
- **Gratuita** y de código abierto
- **1.9M+ productos** con códigos de barras
- **Información nutricional** completa
- **Soporte multiidioma**

### FatSecret (Respaldo)
- API premium con alta precisión
- Base de datos global extensa
- Información nutricional detallada

### Spoonacular (Recetas)
- Análisis de recetas
- Sugerencias basadas en inventario
- Restricciones dietéticas

## 🚀 Despliegue en Vercel

1. **Instalar Vercel CLI**
```bash
npm i -g vercel
```

2. **Configurar proyecto**
```bash
vercel
```

3. **Configurar variables de entorno en Vercel**
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- Otras variables según necesidad

4. **Desplegar**
```bash
vercel --prod
```

## 🔒 Seguridad

- **Helmet.js** para headers de seguridad
- **Rate limiting** para prevenir abuso
- **Validación de entrada** con express-validator
- **Autenticación JWT** con refresh tokens
- **Encriptación de contraseñas** con bcryptjs

## 📊 Monitoreo

El API incluye endpoints de salud:
- `GET /health` - Estado del servidor
- `GET /api/health` - Estado de la API y base de datos

## 🧪 Testing

```bash
# Ejecutar tests (cuando estén configurados)
npm test

# Linting (cuando esté configurado)
npm run lint
```

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

### v1.0.0
- ✅ Autenticación JWT completa
- ✅ Integración Open Food Facts
- ✅ Gestión de inventario
- ✅ Soporte multiidioma
- ✅ Despliegue en Vercel# eatnotwaste-backend
