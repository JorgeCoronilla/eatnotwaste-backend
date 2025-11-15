import express, { Response, Request } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { NotificationService } from '../services/NotificationService';
import { NotificationScheduler } from '../services/NotificationScheduler';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

console.log('🔔 Notification routes loaded');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API for managing notifications
 */

/**
 * @route   POST /api/notifications/register-device
 * @desc    Registrar token de dispositivo para notificaciones push
 * @access  Private
 */

/**
 * @swagger
 * /api/notifications/register-device:
 *   post:
 *     summary: Register a device for push notifications
 *     description: Registers a device token to enable push notifications.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmToken
 *               - deviceId
 *               - platform
 *             properties:
 *               fcmToken:
 *                 type: string
 *               deviceId:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *               appVersion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device registered successfully.
 *       400:
 *         description: Bad request.
 *       401:
 *         description: Unauthorized.
 */
router.post(
  '/register-device',
  authenticateToken,
  [
    body('fcmToken').notEmpty().withMessage('Token FCM es requerido'),
    body('deviceId').notEmpty().withMessage('ID del dispositivo es requerido'),
    body('platform').isIn(['ios', 'android']).withMessage('Plataforma debe ser ios o android'),
    body('appVersion').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Datos de validación incorrectos',
          details: errors.array(),
        });
      }

      const reqAuth = req as AuthenticatedRequest;
      const userId = reqAuth.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        });
      }

      const { fcmToken, deviceId, platform, appVersion } = req.body;

      const notificationService = new NotificationService();
      await notificationService.registerDeviceToken(
        userId,
        deviceId,
        fcmToken,
        platform,
        appVersion
      );

      return res.json({
        success: true,
        message: 'Dispositivo registrado exitosamente',
      });
    } catch (error) {
      console.error('Error registering device:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
);

/**
 * @route   DELETE /api/notifications/unregister-device/:deviceId
 * @desc    Desregistrar dispositivo
 * @access  Private
 */
router.delete('/unregister-device/:deviceId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    const deviceId = req.params.deviceId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'ID del dispositivo es requerido',
      });
    }

    const notificationService = new NotificationService();
    await notificationService.unregisterDeviceToken(userId, deviceId);

    return res.json({
      success: true,
      message: 'Dispositivo desregistrado exitosamente',
    });
  } catch (error) {
    console.error('Error unregistering device:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
});

/**
 * @route   POST /api/notifications/send
 * @desc    Enviar notificación a un usuario específico
 * @access  Private (Admin only)
 */
router.post(
  '/send',
  authenticateToken,
  [
    body('targetUserId').notEmpty().withMessage('ID del usuario objetivo es requerido'),
    body('title').notEmpty().withMessage('Título es requerido'),
    body('body').notEmpty().withMessage('Cuerpo del mensaje es requerido'),
    body('data').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Datos de validación incorrectos',
          details: errors.array(),
        });
      }

      const reqAuth = req as AuthenticatedRequest;
      // Verificar que el usuario sea admin
      if (reqAuth.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado',
        });
      }

      const { targetUserId, title, body, data } = req.body;

      const notificationService = new NotificationService();
      const result = await notificationService.sendNotificationToUser(
        targetUserId,
        { title, body, data }
      );

      return res.json({
        success: true,
        message: 'Notificación enviada',
        data: result,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
);

/**
 * @route   POST /api/notifications/send-expiry-alert
 * @desc    Enviar alerta de productos próximos a vencer
 * @access  Private
 */
router.post('/send-expiry-alert', authenticateToken, async (req: Request, res: Response) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    // Por ahora enviamos una alerta genérica, en el futuro se podría obtener los items reales
    const expiringItems = [{ name: 'Producto de ejemplo', daysUntilExpiry: 2 }];
    
    const notificationService = new NotificationService();
    const result = await notificationService.sendExpiryNotification(userId, expiringItems);

    return res.json({
      success: true,
      message: 'Alerta de vencimiento enviada',
      data: result,
    });
  } catch (error) {
    console.error('Error sending expiry alert:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
});

/**
 * @route   POST /api/notifications/send-shopping-reminder
 * @desc    Enviar recordatorio de compras
 * @access  Private
 */
router.post('/send-shopping-reminder', authenticateToken, async (req: Request, res: Response) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    const { items } = req.body;
    const itemCount = Array.isArray(items) ? items.length : 0;
    
    const notificationService = new NotificationService();
    const result = await notificationService.sendShoppingReminder(userId, itemCount);

    return res.json({
      success: true,
      message: 'Recordatorio de compras enviado',
      data: result,
    });
  } catch (error) {
    console.error('Error sending shopping reminder:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
});

/**
 * @route   GET /api/notifications/history
 * @desc    Obtener historial de notificaciones del usuario
 * @access  Private
 */
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    const { page = 1, limit = 20 } = req.query;
    
    const notificationService = new NotificationService();
    const history = await notificationService.getNotificationHistory(
      userId, 
      parseInt(page as string), 
      parseInt(limit as string)
    );

    return res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error getting notification history:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
});

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Marcar notificación como leída
 * @access  Private
 */
router.put('/:notificationId/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        error: 'ID de notificación es requerido',
      });
    }

    const notificationService = new NotificationService();
    await notificationService.markNotificationAsRead(notificationId);

    return res.json({
      success: true,
      message: 'Notificación marcada como leída',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
});

/**
 * @route   POST /api/notifications/test-expiry-check
 * @desc    Verificar productos próximos a vencer del usuario (para testing)
 * @access  Private
 */
router.post('/test-expiry-check', authenticateToken, async (req: Request, res: Response) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    const notificationScheduler = new NotificationScheduler();
    await notificationScheduler.checkUserExpiringProducts(userId);

    return res.json({
      success: true,
      message: 'Verificación de productos próximos a vencer completada',
    });
  } catch (error) {
    console.error('Error in test expiry check:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
});

/**
 * @route   POST /api/notifications/test-firebase
 * @desc    Probar Firebase sin autenticación (solo para testing)
 * @access  Public
 */
router.post('/test-firebase', async (req: Request, res: Response) => {
  try {
    const notificationService = new NotificationService();
    
    // Simular datos de productos próximos a vencer
    const testExpiringItems = [
      { name: 'Leche', daysUntilExpiry: 2 },
      { name: 'Pan', daysUntilExpiry: 1 }
    ];
    
    // Intentar enviar notificación (aunque no haya tokens registrados)
    const result = await notificationService.sendExpiryNotification(
      'a78f1560-d99b-429c-909b-938e2f47236b', 
      testExpiringItems
    );

    return res.json({
      success: true,
      message: 'Test de Firebase completado',
      result: result,
      note: 'Si no hay tokens FCM registrados, no se enviará notificación real'
    });
  } catch (error) {
    console.error('Error in Firebase test:', error);
    return res.status(500).json({
      success: false,
      error: 'Error en test de Firebase',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;