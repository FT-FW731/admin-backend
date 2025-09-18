import { Router } from "express";
import { authProtect } from "../middlewares/authMiddleware.js";
import {
  createClient,
  getAllClients,
  getSingleClient,
  updateClients,
  deleteClients,
  getClientsLoginHistory,
} from "../controllers/client.controller.js";

const router = Router();

router.post("/", createClient);
router.get("/", authProtect, getAllClients);
router.get("/login-history", authProtect, getClientsLoginHistory);

router.get("/:id", authProtect, getSingleClient);
router.put("/:id", authProtect, updateClients);
router.delete("/:id", authProtect, deleteClients);

export default router;
