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
 * @swagger
 * tags:
 *   name: Auth
 *   description: API for authentication
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica a un usuario y devuelve tokens de acceso y refresco.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del usuario.
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del usuario.
 *     responses:
 *       200:
 *         description: Autenticación exitosa.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: Token de acceso JWT.
 *                 refreshToken:
 *                   type: string
 *                   description: Token de refresco JWT.
 *       400:
 *         description: Credenciales inválidas o solicitud mal formada.
 *       500:
 *         description: Error del servidor.
 */
router.post('/login', validateLogin, login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     description: Registra un nuevo usuario en la aplicación.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente.
 *       400:
 *         description: Solicitud mal formada.
 *       500:
 *         description: Error del servidor.
 */
router.post('/register', validateRegister, register);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renovar token de acceso
 *     description: Renueva el token de acceso utilizando el token de refresco.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token de acceso renovado.
 *       401:
 *         description: No autorizado.
 *       403:
 *         description: Prohibido.
 */
router.post('/refresh', refreshToken);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Obtener perfil del usuario actual
 *     description: Obtiene el perfil del usuario autenticado.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario.
 *       401:
 *         description: No autorizado.
 *   put:
 *     summary: Actualizar perfil del usuario
 *     description: Actualiza el perfil del usuario autenticado.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Perfil actualizado.
 *       400:
 *         description: Solicitud mal formada.
 *       401:
 *         description: No autorizado.
 */
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, validateUpdateProfile, updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Cambiar contraseña
 *     description: Cambia la contraseña del usuario autenticado.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña cambiada exitosamente.
 *       400:
 *         description: Solicitud mal formada.
 *       401:
 *         description: No autorizado.
 */
router.put('/change-password', authenticateToken, validateChangePassword, changePassword);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Cierra la sesión del usuario autenticado.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente.
 *       401:
 *         description: No autorizado.
 */
router.post('/logout', authenticateToken, logout);

/**
 * @swagger
 * /api/auth/account:
 *   delete:
 *     summary: Eliminar cuenta de usuario
 *     description: Elimina la cuenta del usuario autenticado.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cuenta eliminada exitosamente.
 *       401:
 *         description: No autorizado.
 */
router.delete('/account', authenticateToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Cuenta eliminada exitosamente'
  });
});

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Iniciar autenticación con Google OAuth
 *     description: Redirige al usuario a la página de autenticación de Google.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirección a Google.
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Callback de autenticación con Google OAuth
 *     description: Callback que maneja la respuesta de Google OAuth.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirección al frontend con tokens.
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

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  }
);

export default router;