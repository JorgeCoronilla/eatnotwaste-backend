import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

/**
 * Middleware de autenticación
 * Verifica el token JWT y agrega el usuario a req.user
 */
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de acceso requerido'
      });
    }

    // Verificar token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_key'
    ) as any;

    // Por ahora, crear un usuario mock hasta que convirtamos los modelos
    const mockUser = {
      id: decoded.userId || 'mock-user-id',
      email: decoded.email || 'user@example.com',
      role: decoded.role,
      preferences: {
        language: 'es' as const,
        units: 'metric' as const,
        notifications: {
          expiration: true,
          lowStock: true,
          recipes: true,
          marketing: false
        },
        privacy: {
          shareData: false,
          analytics: true
        }
      }
    };

    // Agregar usuario a la request
    req.user = mockUser;

    next();
  } catch (error) {
    console.error('Error en autenticación:', (error as Error).message);
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

/**
 * Middleware de autenticación opcional
 * Similar a authenticateToken pero no falla si no hay token
 */
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_key'
    ) as any;

    // Por ahora, crear un usuario mock hasta que convirtamos los modelos
    const mockUser = {
      id: decoded.userId || 'mock-user-id',
      email: decoded.email || 'user@example.com',
      role: decoded.role || 'user',
      preferences: {
        language: 'es' as const,
        units: 'metric' as const,
        notifications: {
          expiration: true,
          lowStock: true,
          recipes: true,
          marketing: false
        },
        privacy: {
          shareData: false,
          analytics: true
        }
      }
    };

    // Agregar usuario a la request
    req.user = mockUser;

    next();
  } catch (error) {
    // Si hay error en el token opcional, continuar sin usuario
    next();
  }
};

/**
 * Middleware para requerir roles específicos
 */
export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Permisos insuficientes'
      });
    }

    next();
  };
};