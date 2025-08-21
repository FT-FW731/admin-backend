import { Router } from "express";
import upload from "../middlewares/multer.js";
import { uploadRecords } from "../controllers/records.controller.js";

const router = Router();
router.post("/upload", upload.single("file"), uploadRecords);

export default router;
