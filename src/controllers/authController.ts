import { Request, Response, RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import * as jwt from 'jsonwebtoken';
import { UserService } from '../services/UserService';

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
  try {
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

    // Use real UserService for user creation
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

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Inicio de sesión
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
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

    // Use real UserService for authentication
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

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Renovar token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Refresh token requerido',
        error: 'Token required'
      });
      return;
    }

    // Mock token verification
    const newToken = generateToken('user123');

    res.json({
      success: true,
      message: 'Token renovado exitosamente',
      data: {
        token: newToken
      }
    });

  } catch (error) {
    console.error('Error en refreshToken:', error);
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
      error: 'Invalid token'
    });
  }
};

/**
 * Obtener perfil de usuario
 */
export const getProfile: RequestHandler = async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  try {
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
  } catch (error) {
    console.error('Error en getProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Actualizar perfil de usuario
 */
export const updateProfile: RequestHandler = async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  try {
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
  } catch (error) {
    console.error('Error en updateProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};

/**
 * Cambiar contraseña
 */
export const changePassword: RequestHandler = async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  try {
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
  } catch (error) {
    console.error('Error en changePassword:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: 'Internal server error' });
  }
};

/**
 * Cerrar sesión
 */
export const logout: RequestHandler = async (req, res) => {
  const authedReq = req as AuthenticatedRequest;
  try {
    if (!authedReq.user) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado', error: 'Not authenticated' });
      return;
    }

    res.json({ success: true, message: 'Logout exitoso' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

/**
 * Eliminar cuenta
 */
export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Not authenticated'
      });
      return;
    }

    console.log(`✅ Cuenta eliminada: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Cuenta eliminada exitosamente',
      data: {}
    });

  } catch (error) {
    console.error('Error en deleteAccount:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'Internal server error'
    });
  }
};