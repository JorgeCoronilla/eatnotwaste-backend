# EatNotWaste Backend - Reglas del Proyecto (AGENTS.md)

Este archivo define las reglas arquitectónicas y convenciones de código que todos los agentes y LLMs deben seguir al modificar o crear código en el backend.

## Arquitectura y Estructura
- **Framework:** Express.js v5.x con TypeScript.
- **Arquitectura en Capas:** Respeta estrictamente la separación de responsabilidades:
  - **Routes (`src/routes`)**: Solo mapean URLs a Middlewares y Controladores.
  - **Controllers (`src/controllers`)**: Solo manejan el objeto Request y Response, extrayendo parámetros, llamando al servicio y devolviendo la respuesta HTTP o manejando errores específicos.
  - **Services (`src/services`)**: Contienen toda la **lógica de negocio**. Deben ser independientes de Express (no deben recibir `req` o `res`, sino parámetros limpios).
  - **Middlewares (`src/middleware`)**: Para validación (`express-validator`), autenticación (Passport/JWT), y manejo global de errores.

## Base de Datos (Prisma)
- **ORM:** Se utiliza **Prisma** (`prisma client`).
- Al realizar consultas complejas, favorece la API fluida de Prisma o el tipado estricto. 
- Nunca modifiques la base de datos directamente, haz los cambios en `prisma/schema.prisma` y usa los comandos de Prisma CLI (ej. `npm run db:push` en desarrollo).
- **Advertencia de Deuda Técnica:** Existe una dualidad entre `UserItem` y el combo `UserProduct/UserProductLocation`. Asegúrate de interactuar con el modelo activo que la aplicación esté usando en sus controladores actuales para evitar inconsistencias.

## Manejo de Errores (Express 5)
- **Rutas Asíncronas:** Express 5 maneja promesas asíncronas rechazadas de forma nativa. No es necesario usar librerías como `express-async-handler` o envolver todo el controlador en `try/catch` para capturar excepciones no manejadas. Lanza el error y deja que el `errorHandler` central lo procese.
- Devuelve respuestas en un formato consistente: `{ success: boolean, data?: any, error?: string }`.

## Autenticación e Integraciones
- Usa los middlewares definidos en `src/middleware/auth.ts` para proteger rutas.
- Para notificaciones, utiliza el `NotificationService` que envuelve Firebase Admin SDK.
- Las variables de entorno son inyectadas vía `dotenv`. Nunca escribas secretos o URLs absolutas de producción en el código (usa siempre `process.env`).
