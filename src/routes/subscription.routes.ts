import { Router } from "express";
import { authProtect } from "../middlewares/authMiddleware.js";
import {
  getAllSubscriptions,
  initializeOrder,
} from "../controllers/subscription.controller.js";

const router = Router();

router.get("/", authProtect, getAllSubscriptions);
router.post("/initiate-order", authProtect, initializeOrder);

export default router;
