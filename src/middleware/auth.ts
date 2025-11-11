import * as jwt from 'jsonwebtoken';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthenticatedRequest } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware de autenticación
 * Verifica el token JWT y agrega el usuario a req.user
 */
export const authenticateToken: RequestHandler = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Token de acceso requerido' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_key'
    ) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
    }

    (req as AuthenticatedRequest).user = user;

    return next();
  } catch (error) {
    console.error('Error en autenticación:', (error as Error).message);
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
};

/**
 * Middleware de autenticación opcional
 * Similar a authenticateToken pero no falla si no hay token
 */
export const optionalAuth: RequestHandler = async (req, res, next) => {
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

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (user) {
      (req as AuthenticatedRequest).user = user;
    }

    return next();
  } catch (error) {
    return next();
  }
};

/**
 * Middleware para requerir roles específicos
 */
export const requireRole = (roles: string | string[]): RequestHandler => {
  return (req, res, next) => {
    const reqAuth = req as AuthenticatedRequest;

    if (!reqAuth.user) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida'
      });
    }

    const userRole = reqAuth.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Permisos insuficientes'
      });
    }

    return next();
  };
};