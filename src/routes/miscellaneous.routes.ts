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
import { authorize } from "../middlewares/permissionsMiddleware.js";
import { PERMISSIONS } from "../constants/permissions.constants.js";

const router = Router();

router.get(
  "/banners",
  authProtect,
  authorize(PERMISSIONS.BANNER.VIEW),
  getBanners
);
router.get(
  "/payments",
  authProtect,
  authorize(PERMISSIONS.PAYMENT.VIEW),
  getPayments
);
router.get(
  "/payments/stats",
  authProtect,
  authorize(PERMISSIONS.PAYMENT.VIEW),
  getPaymentStats
);
router.get(
  "/dashboard",
  authProtect,
  authorize(PERMISSIONS.DASHBOARD.VIEW),
  getPortalDashboardData
);

router.put(
  "/banners/:id",
  authProtect,
  authorize(PERMISSIONS.BANNER.VIEW),
  updateBanner
);
router.put(
  "/dashboard/:id",
  authProtect,
  authorize(PERMISSIONS.DASHBOARD.VIEW),
  updatePortalDashboardData
);

export default router;
