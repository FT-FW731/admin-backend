import { Router } from "express";
import { authProtect } from "../middlewares/authMiddleware.js";
import {
  getBanners,
  updateBanner,
  getPortalDashboardData,
  updatePortalDashboardData,
} from "../controllers/miscellaneous.controller.js";

const router = Router();

router.get("/banners", authProtect, getBanners);
router.get("/dashboard", authProtect, getPortalDashboardData);

router.put("/banners/:id", authProtect, updateBanner);
router.put("/dashboard/:id", authProtect, updatePortalDashboardData);

export default router;
