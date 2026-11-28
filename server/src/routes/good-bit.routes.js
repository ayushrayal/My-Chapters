import { Router } from 'express';
import { GoodBitController } from '../controllers/good-bit.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import {
  createGoodBitSchema,
  updateGoodBitSchema,
  goodBitIdParamSchema,
  dateParamSchema,
  monthQuerySchema
} from '../validators/good-bit.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

// All Good Bits routes require an active authenticated user session
router.use(requireAuth);

router.post(
  '/',
  validateBody(createGoodBitSchema),
  asyncHandler(GoodBitController.createEntry)
);

router.get(
  '/month',
  validateQuery(monthQuerySchema),
  asyncHandler(GoodBitController.getEntriesByMonth)
);

router.get(
  '/memories',
  asyncHandler(GoodBitController.getHistoricalMemories)
);

router.get(
  '/date/:date',
  validateParams(dateParamSchema),
  asyncHandler(GoodBitController.getEntriesByDate)
);

router.patch(
  '/:id',
  validateParams(goodBitIdParamSchema),
  validateBody(updateGoodBitSchema),
  asyncHandler(GoodBitController.updateEntry)
);

router.delete(
  '/:id',
  validateParams(goodBitIdParamSchema),
  asyncHandler(GoodBitController.deleteEntry)
);

export default router;
