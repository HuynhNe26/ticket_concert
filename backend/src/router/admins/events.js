import express from "express";
import { EventControllers } from "../../controllers/admins/events.js";

const router = express.Router();

// ============ LẤY DANH SÁCH SỰ KIỆN (CÓ SẴN) ============
router.get("/", EventControllers.getAllEvent); 

// ============ TẠO SỰ KIỆN MỚI (THÊM MỚI) ============
router.post("/create", EventControllers.createEvent);

// ============ LẤY CHI TIẾT 1 SỰ KIỆN (THÊM MỚI) ============
router.get("/:id", EventControllers.getEventById);

// ============ CẬP NHẬT SỰ KIỆN (THÊM MỚI) ============
router.put("/:id", EventControllers.updateEvent);

// ============ XÓA SỰ KIỆN (THÊM MỚI) ============
router.delete("/:id", EventControllers.deleteEvent);

// ============ TOGGLE TRẠNG THÁI SỰ KIỆN (THÊM MỚI) ============
router.patch("/:id/status", EventControllers.toggleEventStatus);

export default router;