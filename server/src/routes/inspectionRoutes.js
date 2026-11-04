import express from 'express';
import {
  getInspections,
  getInspectionById,
  createInspection,
  signOffInspection
} from '../controllers/inspectionController.js';

const router = express.Router();

router.get('/', getInspections);
router.post('/', createInspection);
router.get('/:id', getInspectionById);
router.patch('/:id/sign-off', signOffInspection);

export default router;

