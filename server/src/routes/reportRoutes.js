import express from 'express';
import { getQualityReport } from '../controllers/reportController.js';

const router = express.Router();

router.get('/:batchId', getQualityReport);

export default router;

