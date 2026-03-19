import express from 'express';
import { LayoutControllers } from '../../controllers/admins/layout.js';

const router = express.Router();

router.get('/', LayoutControllers.getAllLayouts);
router.get('/:eventId/zones', LayoutControllers.getZonesByEventId);
router.get('/:eventId', LayoutControllers.getLayoutByEventId);
router.post('/:eventId', LayoutControllers.createLayout);
router.put('/:eventId', LayoutControllers.updateLayout);
router.delete('/:eventId', LayoutControllers.deleteLayout);

export default router;