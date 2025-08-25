import { Router } from "express";
import { authProtect } from "../middlewares/authMiddleware.js";
import {
  getAllSubscriptions,
  initializeOrder,
  updateSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();

router.get("/", authProtect, getAllSubscriptions);
router.post("/initiate-order", authProtect, initializeOrder);

router.put("/:id", authProtect, updateSubscription);

export default router;
