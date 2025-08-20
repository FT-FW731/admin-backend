import { StatusCodes } from "http-status-codes";
import { ApiError } from "../middlewares/errorHandler.js";

/**
 * Validates required fields and throws an ApiError if any are missing
 * @param fields Object containing field name-value pairs to validate
 * @throws ApiError with BAD_REQUEST status if any required fields are missing
 */
export const validateRequiredFields = (fields: Record<string, any>): void => {
  const missingFields = Object.entries(fields)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    throw new ApiError({
      status: StatusCodes.BAD_REQUEST,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
};
