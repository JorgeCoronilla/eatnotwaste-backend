import express, { Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DashboardService } from '../services/DashboardService';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

/**
 * @route   GET /api/dashboard
 * @desc    Obtener datos completos del dashboard
 * @access  Private
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
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
router.get('/inventory-summary', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
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
router.get('/consumption-stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
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