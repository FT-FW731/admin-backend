import { Router } from "express";
import { authProtect } from "../middlewares/authMiddleware.js";
import {
  createPermission,
  getAllPermissions,
  assignPermissionsToUser,
} from "../controllers/permission.controller.js";

const router = Router();

router.get("/", authProtect, getAllPermissions);
router.post("/", authProtect, createPermission);
router.post("/assign", authProtect, assignPermissionsToUser);

export default router;
