import fs from "fs";
import XLSX from "xlsx";
import path from "path";
import prisma from "../db/index.js";
import config from "../config/index.js";
import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/apiResponse.js";
import { ApiError } from "../middlewares/errorHandler.js";
import { validateRequiredFields } from "../utils/helpers.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  parseRecordsFromFile,
  processAndInsertRecordsByType,
  RECORD_TYPES,
} from "../services/records.service.js";

export const uploadRecords = asyncHandler(async (req, res) => {
  const { type } = req.body;
  validateRequiredFields({ type });

  if (!RECORD_TYPES.includes(type)) {
    throw new ApiError({
      status: StatusCodes.BAD_REQUEST,
      message: "Invalid record type",
    });
  }

  const file = req.file;
  if (!file) {
    throw new ApiError({
      status: StatusCodes.BAD_REQUEST,
      message: "No file uploaded",
    });
  }

  let records: any[] = [];
  try {
    records = await parseRecordsFromFile(file);
  } catch (err) {
    throw new ApiError({
      status: StatusCodes.BAD_REQUEST,
      message: "Unsupported file type or error parsing file",
    });
  }

  try {
    const insertedCount = await processAndInsertRecordsByType(type, records);

    new ApiResponse({
      res,
      status: StatusCodes.OK,
      message: "File uploaded and data inserted successfully",
      data: {
        fileName: file.filename,
        totalRecords: records.length,
        insertedRecords: insertedCount,
      },
    });
  } catch (error: Error | any) {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    throw new ApiError({
      status: StatusCodes.INTERNAL_SERVER_ERROR,
      message: error?.message,
    });
  }
});
