import { Request, Response, RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import * as jwt from 'jsonwebtoken';
import { UserService } from '../services/UserService';
import { checkVersion } from '../utils/version';

// Interfaces simplificadas
interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthenticatedRequest extends Request {
  user?: UserData;
}


/**
 * Generar token JWT
 */
const generateToken = (userId: string, role: string = 'user'): string => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'fallback_secret_key',
    { expiresIn: '7d' }
  );
};

/**
 * Registro de usuario
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
          res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            error: 'Validation failed',
            details: errors.array()
          });
          return;
        }
    const { name, email, password } = req.body;
    const result = await UserService.createUser({
          name,
          email,
          password
        });
    if (!result.success) {
          res.status(400).json({
            success: false,
            message: result.error || 'Error al crear usuario'
          });
          return;
        }
    res.status(201).json({
          success: true,
          message: result.message || 'Usuario registrado exitosamente',
          data: {
            user: result.data
          }
        });
};

/**
 * Inicio de sesión
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
          res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            error: 'Validation failed',
            details: errors.array()
          });
          return;
        }
    const { email, password } = req.body;
    const versionCheck = checkVersion(req);
    if (!versionCheck.valid) {
          res.status(426).json({
            success: false,
            message: 'Actualización requerida',
            error: versionCheck.message
          });
          return;
        }
    const result = await UserService.authenticateUser(email, password);
    if (!result.success) {
          res.status(401).json({
            success: false,
            message: result.error || 'Credenciales inválidas'
          });
          return;
        }
    res.json({
          success: true,
          message: result.message || 'Login exitoso',
          data: {
            user: result.data!.user,
            token: result.data!.token,
            refreshToken: result.data!.refreshToken
          }
        });
};

/**
 * Renovar token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
    const versionCheck = checkVersion(req);
    if (!versionCheck.valid) {
          res.status(426).json({
            success: false,
            message: 'Actualización requerida',
            error: versionCheck.message
          });
          return;
        }
    if (!token) {
          res.status(401).json({
            success: false,
            message: 'Refresh token requerido',
            error: 'Token required'
          });
          return;
        }
    const newToken = generateToken('user123');
    res.json({
          success: true,
          message: 'Token renovado exitosamente',
          data: {
            token: newToken
          }
        });
};

/**
 * Obtener perfil de usuario
 */
export const getProfile: RequestHandler = async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!authedReq.user) {
          res.status(401).json({
            success: false,
            message: 'Usuario no autenticado',
            error: 'Not authenticated'
          });
          return;
        }
    res.json({
          success: true,
          message: 'Perfil obtenido exitosamente',
          data: authedReq.user
        });
};

/**
 * Actualizar perfil de usuario
 */
export const updateProfile: RequestHandler = async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
          res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            error: 'Validation failed'
          });
          return;
        }
    if (!authedReq.user) {
          res.status(401).json({
            success: false,
            message: 'Usuario no autenticado',
            error: 'Not authenticated'
          });
          return;
        }
    const updatedUser: UserData = {
          ...authedReq.user,
          ...req.body
        };
    res.json({
          success: true,
          message: 'Perfil actualizado exitosamente',
          data: updatedUser
        });
};

/**
 * Cambiar contraseña
 */
export const changePassword: RequestHandler = async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
          res.status(400).json({ success: false, message: 'Datos de entrada inválidos', error: 'Validation failed' });
          return;
        }
    if (!authedReq.user) {
          res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
          return;
        }
    res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
};

/**
 * Cerrar sesión
 */
export const logout: RequestHandler = async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  if (!authedReq.user) {
          res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
          return;
        }
    res.json({ success: true, message: 'Logout exitoso' });
};

/**
 * Eliminar cuenta
 */
export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
          res.status(401).json({
            success: false,
            message: 'Usuario no autenticado',
            error: 'Not authenticated'
          });
          return;
        }
    const result = await UserService.deleteUser(req.user.id);
    if (!result.success) {
          res.status(500).json({
            success: false,
            message: result.error || 'Error al eliminar cuenta'
          });
          return;
        }
    res.json({
          success: true,
          message: result.message || 'Cuenta eliminada exitosamente'
        });
};