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

const router = Router();

router.post("/signup", createAdminUser);
router.post("/login", signInAdminUser);
router.get("/me", authProtect, getAdminUser);
router.get("/users", authProtect, getAllAdminUsers);
router.put("/users/:id", authProtect, updateAdminUser);
router.delete("/users/:id", authProtect, deleteAdminUser);

export default router;
