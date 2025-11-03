import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { NotificationService } from '../services/NotificationService';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

/**
 * @route   POST /api/notifications/register-device
 * @desc    Registrar token de dispositivo para notificaciones push
 * @access  Private
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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Datos de validación incorrectos',
          details: errors.array(),
        });
      }

      const userId = req.user?.id;
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
router.delete('/unregister-device/:deviceId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Datos de validación incorrectos',
          details: errors.array(),
        });
      }

      // Verificar que el usuario sea admin
      if (req.user?.role !== 'admin') {
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
router.post('/send-expiry-alert', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

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
router.post('/send-shopping-reminder', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

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
router.get('/history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

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
router.put('/:notificationId/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
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

export default router;