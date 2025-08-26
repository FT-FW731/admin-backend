import { Router } from "express";
import { authProtect } from "../middlewares/authMiddleware.js";
import {
  getBanners,
  getPayments,
  updateBanner,
  getPaymentStats,
  getPortalDashboardData,
  updatePortalDashboardData,
} from "../controllers/miscellaneous.controller.js";

const router = Router();

router.get("/banners", authProtect, getBanners);
router.get("/payments", authProtect, getPayments);
router.get("/payments/stats", authProtect, getPaymentStats);
router.get("/dashboard", authProtect, getPortalDashboardData);

router.put("/banners/:id", authProtect, updateBanner);
router.put("/dashboard/:id", authProtect, updatePortalDashboardData);

export default router;
