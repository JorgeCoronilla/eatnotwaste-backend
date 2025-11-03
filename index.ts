import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Configurar variables de entorno
dotenv.config();

// Importar middlewares
import { errorHandler, notFound } from './src/middleware/errorHandler';
import { requestIdMiddleware, morganConfig, authLogger, performanceLogger } from './src/middleware/logger';

// Importar rutas
import authRoutes from './src/routes/auth';
import productRoutes from './src/routes/products';
import inventoryRoutes from './src/routes/inventory';
import recipeRoutes from './src/routes/recipes';
import userRoutes from './src/routes/users';
import dashboardRoutes from './src/routes/dashboard';
import notificationRoutes from './src/routes/notifications';

// Crear aplicación Express
const app = express();

// Configuración de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana de tiempo
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos.'
  }
});

// Middlewares de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://freshkeeper.vercel.app', 'https://www.freshkeeper.app']
    : [
        'http://localhost:3000', 
        'http://localhost:5173', 
        'http://localhost:5174', // Puerto HTTP para diagnóstico móvil
        'http://localhost:5175', // Puerto HTTPS alternativo
        'http://localhost:19006',
        'https://localhost:5173', // HTTPS localhost
        'https://localhost:5175', // HTTPS localhost alternativo
        'https://192.168.1.111:5173', // IP local para acceso desde móvil HTTPS
        'https://192.168.1.111:5175', // IP local para acceso desde móvil HTTPS alternativo
        'http://192.168.1.111:5173', // IP local para acceso desde móvil HTTPS
        'http://192.168.1.111:5174', // IP local para acceso desde móvil HTTP
        'http://192.168.1.111:3000',
        'https://localhost:3000', // Backend HTTPS localhost
        'https://192.168.1.111:3000' // Backend HTTPS IP local
      ],
  credentials: true
}));
app.use(limiter);

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middlewares de logging y request ID
app.use(requestIdMiddleware);
app.use(authLogger);
app.use(performanceLogger(2000)); // Log requests que tomen más de 2 segundos

// Middleware de logging HTTP
if (process.env.NODE_ENV !== 'production') {
  app.use(morganConfig);
}

// Conectar a la base de datos
import './src/config/database';

// Rutas principales
app.get('/', (req, res) => {
  res.json({
    message: '🥬 FreshKeeper API v1.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      inventory: '/api/inventory',
      recipes: '/api/recipes',
      users: '/api/users'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// Middleware de rutas no encontradas
app.use(notFound);

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

// Para desarrollo local
const PORT = Number(process.env.PORT) || 3000;

// Iniciar servidor en todos los entornos
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FreshKeeper API ejecutándose en puerto ${PORT}`);
  console.log(`📱 Health check disponible en /health`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🌐 Local access: http://localhost:${PORT}/health`);
    console.log(`🌐 Network access: http://192.168.1.111:${PORT}/health`);
  }
});

// Manejar cierre graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Exportar para Vercel
export default app;