import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';

// Tipos de errores personalizados
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationAppError extends AppError {
  public errors: ValidationError[];

  constructor(message: string, errors: ValidationError[]) {
    super(message, 400);
    this.errors = errors;
  }
}

// Middleware de manejo de errores
export const errorHandler = (
  err: Error | AppError | ValidationAppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err } as any;
  error.message = err.message;

  // Log del error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Error de validación de express-validator
  if (err instanceof ValidationAppError) {
    const message = 'Errores de validación';
    res.status(400).json({
      success: false,
      error: message,
      details: err.errors,
    });
    return;
  }

  // Error personalizado de la aplicación
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Error de Prisma - Registro duplicado
  if (error.code === 'P2002') {
    const message = 'Recurso duplicado. Este registro ya existe.';
    res.status(409).json({
      success: false,
      error: message,
    });
    return;
  }

  // Error de Prisma - Registro no encontrado
  if (error.code === 'P2025') {
    const message = 'Recurso no encontrado';
    res.status(404).json({
      success: false,
      error: message,
    });
    return;
  }

  // Error de Prisma - Violación de restricción de clave foránea
  if (error.code === 'P2003') {
    const message = 'Error de referencia. El recurso relacionado no existe.';
    res.status(400).json({
      success: false,
      error: message,
    });
    return;
  }

  // Error de JWT
  if (error.name === 'JsonWebTokenError') {
    const message = 'Token inválido';
    res.status(401).json({
      success: false,
      error: message,
    });
    return;
  }

  // Error de JWT expirado
  if (error.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    res.status(401).json({
      success: false,
      error: message,
    });
    return;
  }

  // Error de sintaxis JSON
  if (error.type === 'entity.parse.failed') {
    const message = 'JSON inválido en el cuerpo de la solicitud';
    res.status(400).json({
      success: false,
      error: message,
    });
    return;
  }

  // Error de tamaño de payload
  if (error.type === 'entity.too.large') {
    const message = 'Payload demasiado grande';
    res.status(413).json({
      success: false,
      error: message,
    });
    return;
  }

  // Error de conexión a la base de datos
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    const message = 'Error de conexión a la base de datos';
    res.status(503).json({
      success: false,
      error: message,
    });
    return;
  }

  // Error genérico del servidor
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message;

  res.status(500).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

// Middleware para capturar errores asíncronos
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware para rutas no encontradas
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Ruta no encontrada - ${req.originalUrl}`, 404);
  next(error);
};

// Función para crear errores de validación
export const createValidationError = (errors: ValidationError[]): ValidationAppError => {
  return new ValidationAppError('Errores de validación', errors);
};

export default {
  AppError,
  ValidationAppError,
  errorHandler,
  asyncHandler,
  notFound,
  createValidationError,
};