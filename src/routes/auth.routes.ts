import { Router } from "express";
import { authProtect } from "../middlewares/authMiddleware.js";
import {
  createAdminUser,
  signInAdminUser,
  getAdminUser,
  getAllAdminUsers,
  updateAdminUser,
  deleteAdminUser,
} from "../controllers/auth.controller.js";
import { authorize } from "../middlewares/permissionsMiddleware.js";
import { PERMISSIONS } from "../constants/permissions.constants.js";

const router = Router();

router.post("/signup", createAdminUser);
router.post("/login", signInAdminUser);
router.get("/me", authProtect, getAdminUser);
router.get(
  "/users",
  authProtect,
  authorize(PERMISSIONS.USER_ROLES.VIEW),
  getAllAdminUsers
);

router.put(
  "/users/:id",
  authProtect,
  authorize(PERMISSIONS.USER_ROLES.VIEW),
  updateAdminUser
);
router.delete(
  "/users/:id",
  authProtect,
  authorize(PERMISSIONS.USER_ROLES.VIEW),
  deleteAdminUser
);

export default router;
