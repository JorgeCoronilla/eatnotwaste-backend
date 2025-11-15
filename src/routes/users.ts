import express, { Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { prisma } from '../config/database';

const router = express.Router();

// Placeholder para rutas de usuarios
// TODO: Implementar controlador de usuarios completo

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API for managing users
 */

/**
 * @route   GET /api/users
 * @desc    Obtener lista de usuarios (solo admin)
 * @access  Private (Admin only)
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get a list of users (admin only)
 *     description: Retrieves a list of all users. This endpoint is restricted to administrators.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of users.
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
router.get('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    // TODO: Implementar listado de usuarios para admin
    res.json({
      success: true,
      message: 'Listado de usuarios - En desarrollo',
      data: {
        users: [],
        total: 0,
        page: 1,
        limit: 10
      }
    });
  } catch (error) {
    console.error('Error en GET /users:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/users/stats
 * @desc    Obtener estadísticas de usuarios
 * @access  Private
 */

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics
 *     description: Retrieves statistics for the authenticated user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics.
 *       401:
 *         description: Unauthorized.
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // TODO: Implementar estadísticas de usuario
    res.json({
      success: true,
      message: 'Estadísticas de usuario - En desarrollo',
      data: {
        totalScans: 0,
        totalProducts: 0,
        wasteReduced: 0,
        moneySaved: 0,
        streakDays: 0
      }
    });
  } catch (error) {
    console.error('Error en GET /users/stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   PUT /api/users/preferences
 * @desc    Actualizar preferencias de usuario
 * @access  Private
 */

/**
 * @swagger
 * /api/users/preferences:
 *   put:
 *     summary: Update user preferences
 *     description: Updates the preferences for the authenticated user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserPreferences'
 *     responses:
 *       200:
 *         description: User preferences updated successfully.
 *       400:
 *         description: Bad request.
 *       401:
 *         description: Unauthorized.
 */
router.put('/preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    // TODO: Implementar actualización de preferencias
    res.json({
      success: true,
      message: 'Actualización de preferencias - En desarrollo',
      data: {
        preferences: req.body
      }
    });
  } catch (error) {
    console.error('Error en PUT /users/preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   GET /api/users/notification-settings
 * @desc    Obtener configuración de notificaciones del usuario
 * @access  Private
 */
router.get('/notification-settings', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    // Buscar configuración existente o crear una por defecto
    let settings = await prisma.userNotificationSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      // Crear configuración por defecto
      settings = await prisma.userNotificationSettings.create({
        data: {
          userId,
          expiryAlerts: true,
          expiryDaysBefore: 2,
          shoppingReminders: true,
          shoppingReminderTime: "10:00:00",
          shoppingReminderDays: [1, 3, 5],
          weeklySummary: true,
          weeklySummaryDay: 0,
          weeklySummaryTime: "18:00:00"
        }
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @route   PUT /api/users/notification-settings
 * @desc    Actualizar configuración de notificaciones del usuario
 * @access  Private
 */
router.put('/notification-settings', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
      return;
    }

    const {
      expiryAlerts,
      expiryDaysBefore,
      shoppingReminders,
      shoppingReminderTime,
      shoppingReminderDays,
      weeklySummary,
      weeklySummaryDay,
      weeklySummaryTime
    } = req.body;

    // Actualizar o crear configuración
    const settings = await prisma.userNotificationSettings.upsert({
      where: { userId },
      update: {
        ...(expiryAlerts !== undefined && { expiryAlerts }),
        ...(expiryDaysBefore !== undefined && { expiryDaysBefore }),
        ...(shoppingReminders !== undefined && { shoppingReminders }),
        ...(shoppingReminderTime !== undefined && { shoppingReminderTime }),
        ...(shoppingReminderDays !== undefined && { shoppingReminderDays }),
        ...(weeklySummary !== undefined && { weeklySummary }),
        ...(weeklySummaryDay !== undefined && { weeklySummaryDay }),
        ...(weeklySummaryTime !== undefined && { weeklySummaryTime }),
      },
      create: {
        userId,
        expiryAlerts: expiryAlerts ?? true,
        expiryDaysBefore: expiryDaysBefore ?? 2,
        shoppingReminders: shoppingReminders ?? true,
        shoppingReminderTime: shoppingReminderTime ?? "10:00:00",
        shoppingReminderDays: shoppingReminderDays ?? [1, 3, 5],
        weeklySummary: weeklySummary ?? true,
        weeklySummaryDay: weeklySummaryDay ?? 0,
        weeklySummaryTime: weeklySummaryTime ?? "18:00:00"
      }
    });

    res.json({
      success: true,
      data: settings,
      message: 'Configuración actualizada correctamente'
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

export default router;