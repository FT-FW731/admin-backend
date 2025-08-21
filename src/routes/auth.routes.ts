import { Router } from "express";
import { authProtect } from "../middlewares/authMiddleware.js";
import {
  createAdminUser,
  signInAdminUser,
  getAdminUser,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup", createAdminUser);
router.post("/login", signInAdminUser);
router.get("/me", authProtect, getAdminUser);

export default router;
