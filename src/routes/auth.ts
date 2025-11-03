import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { ApiResponse } from '../types';

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
export default router;