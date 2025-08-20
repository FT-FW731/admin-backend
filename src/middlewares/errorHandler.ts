import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import ApiResponse from "../utils/apiResponse.js";

export class ApiError extends Error {
  status: number;

  constructor({ status, message }: { status: number; message: string }) {
    super(message);
    this.status = status;
  }
}

export const handleErrorResponse = (
  res: Response,
  error: ApiError | Error | any
) => {
  console.error(error.stack);
  new ApiResponse({
    res,
    status: error?.status || StatusCodes.INTERNAL_SERVER_ERROR,
    message: error?.message || "Internal Server Error",
  });
};
