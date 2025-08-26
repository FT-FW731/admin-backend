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

/**
 * Split an array into chunks of the given size.
 *
 * @template T - type of array elements
 * @param {T[]} arr - The array to chunk.
 * @param {number} size - Maximum size of each chunk. Must be > 0.
 * @returns {T[][]} An array of chunks (arrays). Returns [] if input is not an array or size <= 0.
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  if (!Array.isArray(arr) || size <= 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
