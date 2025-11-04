import * as express from 'express';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import passport from 'passport';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Controladores
import {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  logout
} from '../controllers/authController';

// Middleware
import { authenticateToken } from '../middleware/auth';
import {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateUpdateProfile
} from '../middleware/validation';

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario
 * @access  Public
 */
router.post('/register', validateRegister, register);

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
router.post('/login', validateLogin, login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Renovar token de acceso
 * @access  Public
 */
router.post('/refresh', refreshToken);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario actual
 * @access  Private
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Actualizar perfil del usuario
 * @access  Private
 */
router.put('/profile', authenticateToken, validateUpdateProfile, updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Cambiar contraseña
 * @access  Private
 */
router.put('/change-password', authenticateToken, validateChangePassword, changePassword);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión
 * @access  Private
 */
router.post('/logout', authenticateToken, logout);

/**
 * Eliminar cuenta (mock)
 * @route   DELETE /api/auth/account
 * @desc    Eliminar cuenta de usuario
 * @access  Private
 */
router.delete('/account', authenticateToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Cuenta eliminada exitosamente'
  });
});

/**
 * @route   GET /api/auth/google
 * @desc    Iniciar autenticación con Google OAuth
 * @access  Public
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

/**
 * @route   GET /api/auth/google/callback
 * @desc    Callback de autenticación con Google OAuth
 * @access  Public
 */
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req: Request, res: Response) => {
    const reqAuth = req as AuthenticatedRequest;
    const user = reqAuth.user;

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?error=NoUser`);
    }

    // Generar tokens JWT
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );
    
    // Redirigir al frontend con los tokens
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  }
);

export default router;