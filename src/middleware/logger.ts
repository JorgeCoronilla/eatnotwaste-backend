import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

// Interfaz para el contexto de logging
interface LogContext {
  requestId: string;
  userId?: string;
  method: string;
  url: string;
  ip: string;
  userAgent?: string | undefined;
  timestamp: string;
}

// Generar ID único para cada request
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Middleware para agregar requestId a cada request
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = generateRequestId();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Función para crear contexto de logging
const createLogContext = (req: Request): LogContext => {
  return {
    requestId: (req as any).requestId || 'unknown',
    userId: (req as any).user?.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || undefined,
    timestamp: new Date().toISOString(),
  };
};

// Logger personalizado
export class Logger {
  static info(message: string, context?: any): void {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    }));
  }

  static error(message: string, error?: Error, context?: any): void {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      timestamp: new Date().toISOString(),
      ...context,
    }));
  }

  static warn(message: string, context?: any): void {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    }));
  }

  static debug(message: string, context?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...context,
      }));
    }
  }
}

// Middleware de logging de requests
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const context = createLogContext(req);

  // Log del inicio del request
  Logger.info('Request started', {
    ...context,
    body: req.method !== 'GET' ? req.body : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
  });

  // Interceptar el final del response
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = Date.now() - startTime;
    
    // Log del final del request
    Logger.info('Request completed', {
      ...context,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      responseSize: body ? Buffer.byteLength(body, 'utf8') : 0,
    });

    return originalSend.call(this, body);
  };

  next();
};

// Configuración de Morgan para desarrollo
export const morganConfig = morgan((tokens, req, res) => {
  const requestId = (req as any).requestId || 'unknown';
  const userId = (req as any).user?.id || 'anonymous';
  
  return [
    `[${requestId}]`,
    `[${userId}]`,
    tokens.method?.(req, res) || '-',
    tokens.url?.(req, res) || '-',
    tokens.status?.(req, res) || '-',
    tokens.res?.(req, res, 'content-length') || '-', '-',
    tokens['response-time']?.(req, res) || '-', 'ms'
  ].join(' ');
});

// Middleware para logging de errores de autenticación
export const authLogger = (req: Request, res: Response, next: NextFunction): void => {
  const originalStatus = res.status;
  
  res.status = function(code: number) {
    if (code === 401 || code === 403) {
      const context = createLogContext(req);
      Logger.warn(`Authentication/Authorization failed`, {
        ...context,
        statusCode: code,
        authHeader: req.get('Authorization') ? 'present' : 'missing',
      });
    }
    return originalStatus.call(this, code);
  };

  next();
};

// Middleware para logging de operaciones sensibles
export const sensitiveOperationLogger = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const context = createLogContext(req);
    
    Logger.info(`Sensitive operation: ${operation}`, {
      ...context,
      operation,
    });

    next();
  };
};

// Middleware para logging de performance
export const performanceLogger = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (duration > threshold) {
        const context = createLogContext(req);
        Logger.warn(`Slow request detected`, {
          ...context,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
        });
      }
    });

    next();
  };
};

export default {
  Logger,
  requestIdMiddleware,
  requestLogger,
  morganConfig,
  authLogger,
  sensitiveOperationLogger,
  performanceLogger,
};