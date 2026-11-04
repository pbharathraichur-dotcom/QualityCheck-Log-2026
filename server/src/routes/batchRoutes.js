import express from 'express';
import {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  updateDisposition
} from '../controllers/batchController.js';

const router = express.Router();

router.get('/', getBatches);
router.post('/', createBatch);
router.get('/:id', getBatchById);
router.put('/:id', updateBatch);
router.delete('/:id', deleteBatch);
router.patch('/:id/disposition', updateDisposition);

export default router;

