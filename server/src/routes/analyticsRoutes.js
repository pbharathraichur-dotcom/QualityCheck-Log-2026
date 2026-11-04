import express from 'express';
import { getDashboardStats, compareBatches } from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/dashboard', getDashboardStats);
router.post('/compare', compareBatches);

export default router;

