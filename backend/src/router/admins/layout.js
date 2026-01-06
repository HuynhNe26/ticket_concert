import express from 'express';
import { LayoutControllers } from '../../controllers/admins/layout.js';

const router = express.Router();

// ✅ ĐẶT ROUTE CỤ THỂ TRƯỚC, ROUTE CHUNG SAU

// GET: Lấy tất cả layouts - ĐẶT TRƯỚC
router.get('/', LayoutControllers.getAllLayouts);

// GET: Lấy zones theo event_id - ĐẶT TRƯỚC (route cụ thể hơn)
router.get('/:eventId/zones', LayoutControllers.getZonesByEventId);

// GET: Lấy layout và zones theo event_id
router.get('/:eventId', LayoutControllers.getLayoutByEventId);

// POST: Tạo layout mới cho event
router.post('/:eventId', LayoutControllers.createLayout);

// PUT: Cập nhật layout
router.put('/:eventId', LayoutControllers.updateLayout);

// DELETE: Xóa layout
router.delete('/:eventId', LayoutControllers.deleteLayout);

export default router;