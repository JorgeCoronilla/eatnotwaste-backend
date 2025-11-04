import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DashboardService } from '../services/DashboardService';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: API for retrieving dashboard data
 */

/**
 * @route   GET /api/dashboard
 * @desc    Obtener datos completos del dashboard
 * @access  Private
 */

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get complete dashboard data
 *     description: Retrieves all data for the user's dashboard.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data.
 *       401:
 *         description: Unauthorized.
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    const dashboardData = await DashboardService.getDashboardData(userId);
    
    return res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
});

/**
 * @route   GET /api/dashboard/inventory-summary
 * @desc    Obtener resumen del inventario
 * @access  Private
 */

/**
 * @swagger
 * /api/dashboard/inventory-summary:
 *   get:
 *     summary: Get inventory summary
 *     description: Retrieves a summary of the user's inventory.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory summary.
 *       401:
 *         description: Unauthorized.
 */
router.get('/inventory-summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    const summary = await DashboardService.getInventorySummary(userId);
    
    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error getting inventory summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
});

/**
 * @route   GET /api/dashboard/consumption-stats
 * @desc    Obtener estadísticas de consumo
 * @access  Private
 */

/**
 * @swagger
 * /api/dashboard/consumption-stats:
 *   get:
 *     summary: Get consumption statistics
 *     description: Retrieves consumption statistics for the user.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: The number of days to include in the statistics.
 *     responses:
 *       200:
 *         description: Consumption statistics.
 *       401:
 *         description: Unauthorized.
 */
router.get('/consumption-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    const userId = reqAuth.user?.id;
    const days = parseInt(req.query.days as string) || 30;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
    }

    const stats = await DashboardService.getConsumptionStats(userId, days);
    
    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting consumption stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
});

export default router;