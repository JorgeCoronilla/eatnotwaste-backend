// Índice principal del backend - FreshKeeper API
// Este archivo exporta todos los módulos principales del proyecto

// Configuración
export * from './config/database';
export * from './config/passport';
export * from './config/swagger';

// Tipos
export * from './types';

// Middlewares
export * from './middleware';

// Servicios
export * from './services';

// Controladores
export * from './controllers';

// Rutas
export { default as authRoutes } from './routes/auth';
export { default as productRoutes } from './routes/products';
export { default as inventoryRoutes } from './routes/inventoryNew';
export { default as shoppingRoutes } from './routes/shopping';
export { default as recipeRoutes } from './routes/recipes';
export { default as userRoutes } from './routes/users';
export { default as dashboardRoutes } from './routes/dashboard';
export { default as notificationRoutes } from './routes/notifications';

// Utilidades
export * from './utils/index';